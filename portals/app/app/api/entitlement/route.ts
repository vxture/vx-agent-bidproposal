import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOidcConfig } from "../../auth/lib/config";
import { getAuthUser } from "../../auth/lib/session";
import { getEntitlementResolver } from "../../entitlement/resolver";
import { hasProductAccess, hasDataAccess, ctaFor } from "../../entitlement/types";

// GET /api/entitlement (C2 verification channel): resolve the current session's
// workspace entitlement and expose the gate outcomes. Read-only; never returns
// the platform secret. Works offline via the Mock resolver.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const cfg = getOidcConfig();
  const jar = await cookies();
  const rpsid = jar.get(cfg.cookieName)?.value;
  const user = rpsid ? await getAuthUser(cfg, rpsid).catch(() => null) : null;
  if (!user || !user.activeWorkspace) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const entitlement = await getEntitlementResolver().resolve(user.activeWorkspace);
  return NextResponse.json({
    entitlement,
    gates: {
      productAccess: hasProductAccess(entitlement),
      dataAccess: hasDataAccess(entitlement),
      cta: ctaFor(entitlement),
    },
  });
}
