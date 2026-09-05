import { getOidcConfig } from "../lib/config";
import { verifyToken } from "../lib/oidc";
import { sessionsForSid, deleteSession, claimBclogoutJti } from "../lib/session-store";

// POST /auth/backchannel-logout (080-rp section 2.7): IdP -> RP server call (no
// browser cookie). Verify logout_token (RS256/iss/aud/exp), require the
// backchannel-logout event + sid, forbid nonce, guard replay by jti, then kill
// every RP session for that IdP sid. Best-effort 200.
export const dynamic = "force-dynamic";

const BACKCHANNEL_EVENT = "http://schemas.openid.net/event/backchannel-logout";

export async function POST(req: Request): Promise<Response> {
  const cfg = getOidcConfig();
  const form = await req.formData().catch(() => null);
  const logoutToken = form?.get("logout_token");
  if (typeof logoutToken !== "string") return new Response("bad request", { status: 400 });

  let claims;
  try {
    claims = await verifyToken(logoutToken, cfg);
  } catch {
    return new Response("invalid logout_token", { status: 400 });
  }

  // A logout_token MUST NOT carry a nonce, and MUST carry the backchannel event.
  if (claims.nonce !== undefined) return new Response("nonce forbidden", { status: 400 });
  const events = claims.events as Record<string, unknown> | undefined;
  if (!events || !(BACKCHANNEL_EVENT in events)) {
    return new Response("missing backchannel event", { status: 400 });
  }
  const sid = typeof claims.sid === "string" ? claims.sid : undefined;
  if (!sid) return new Response("missing sid", { status: 400 });

  // Replay guard: only the first delivery for a given jti does the work.
  if (typeof claims.jti === "string") {
    const fresh = await claimBclogoutJti(cfg.clientId, claims.jti);
    if (!fresh) return new Response("", { status: 200 });
  }

  const rpsids = await sessionsForSid(cfg.clientId, sid);
  await Promise.all(rpsids.map((rp) => deleteSession(cfg.clientId, rp).catch(() => {})));
  return new Response("", { status: 200 });
}
