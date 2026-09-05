import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOidcConfig } from "../lib/config";
import { deleteSession } from "../lib/session-store";
import { clearCookieOptions } from "../lib/cookie";
import { randomToken } from "../lib/pkce";

// POST /auth/logout (080-rp section 2.2): destroy the local RP session + clear
// the cookie, then 302 to the IdP end_session endpoint to trigger global logout.
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const cfg = getOidcConfig();
  const jar = await cookies();
  const rpsid = jar.get(cfg.cookieName)?.value;
  if (rpsid) await deleteSession(cfg.clientId, rpsid).catch(() => {});

  const endSession = new URL(cfg.endSessionUrl);
  if (cfg.postLogoutRedirectUri) {
    endSession.searchParams.set("post_logout_redirect_uri", cfg.postLogoutRedirectUri);
  }
  endSession.searchParams.set("state", randomToken(16));

  const res = NextResponse.redirect(endSession.toString());
  res.cookies.set(cfg.cookieName, "", clearCookieOptions(cfg));
  return res;
}
