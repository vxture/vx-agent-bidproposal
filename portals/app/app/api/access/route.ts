import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOidcConfig } from "../../auth/lib/config";
import { getAuthContext } from "../../auth/lib/session";
import { resolveDisplayProfile } from "../../auth/lib/profile";
import { checkProductAssignment, readProductEntitlement } from "../../capability/access";
import { ctaFor, hasDataAccess, hasProductAccess } from "../../entitlement/types";
import { isDeployedStage } from "../../lib/deploy-stage";
import type { AccessState } from "../../access/types";

// GET /api/access - the one call a product front door makes.
//
// It exists because the two facts a gate needs live in different places by
// design: identity comes from the RP session and entitlement is never in the
// token (D12 - always fetched via C2). A client fetching /auth/session and
// /api/entitlement in parallel would be reading the same session twice, and
// those two reads race: both call getAuthUser, which silently refreshes an
// access token inside 60s of expiry using a ROTATING refresh token. One
// rotation wins, the other gets invalid_grant - so a perfectly signed-in user
// can see "authenticated" from one call and 401 from the other.
//
// Resolving once server-side removes the race, halves the Redis and JWKS work,
// and lets the gate render a single decision instead of reconciling two.
export const dynamic = "force-dynamic";

function accessResponse(state: AccessState, status = 200): Response {
  return NextResponse.json(state, { status, headers: { "cache-control": "private, no-store" } });
}

export async function GET(): Promise<Response> {
  const cfg = getOidcConfig();

  // Sign-in not provisioned. On a deployed stack this is a real dead end and
  // the gate must say so rather than offer a button that lands on a 503. On a
  // developer machine it is the normal state, and the gate opens instead -
  // otherwise the front door becomes a wall nobody local can pass.
  if (!cfg.enabled) {
    const state: AccessState = isDeployedStage()
      ? { status: "unconfigured" }
      : { status: "open", reason: "dev-no-oidc" };
    return accessResponse(state);
  }

  const jar = await cookies();
  const rpsid = jar.get(cfg.cookieName)?.value;
  let context;
  try { context = rpsid ? await getAuthContext(cfg, rpsid) : null; }
  catch { return accessResponse({ status: "unavailable" }, 503); }
  if (!context || !rpsid) return accessResponse({ status: "anonymous" });
  const { user, accessToken } = context;

  // A suspended or closed account is not a session (080-rp 2.6). Kept distinct
  // from anonymous: sending this user to sign in again would loop them.
  if (user.accountStatus && user.accountStatus !== "active") {
    return accessResponse({ status: "inactive-account", user });
  }

  // Reuse this already-resolved session; a parallel /auth/session could race
  // the rotating refresh token. Profile failures do not change authorization.
  const profile = await resolveDisplayProfile(cfg, rpsid, context).catch(() => null);
  const displayUser = { ...user, displayName: profile?.displayName ?? null, email: profile?.email ?? null, picture: profile?.picture ?? null, account: profile?.account ?? null };

  // Signed in, but the session carries no workspace to scope entitlement to.
  // Nothing to resolve, and re-authenticating will not add one.
  if (!user.activeWorkspace) {
    return accessResponse({ status: "no-workspace", user: displayUser });
  }

  const caller = {
    workspaceId: user.activeWorkspace,
    sub: user.sub,
    orgId: user.activeOrg ?? undefined,
    mint: { subjectToken: accessToken },
  };
  const entitlement = await readProductEntitlement(caller);
  if ("error" in entitlement) return accessResponse({ status: "unavailable", user: displayUser }, 503);
  if (hasDataAccess(entitlement)) {
    const assignment = await checkProductAssignment(caller);
    if (assignment) return assignment.status === 403
      ? accessResponse({ status: "unassigned", user: displayUser })
      : accessResponse({ status: "unavailable", user: displayUser }, 503);
  }
  return accessResponse({
    status: "authenticated",
    user: displayUser,
    entitlement,
    gates: {
      productAccess: hasProductAccess(entitlement),
      dataAccess: hasDataAccess(entitlement),
      cta: ctaFor(entitlement),
    },
  });
}
