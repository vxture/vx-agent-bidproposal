import { getOidcConfig, type OidcConfig } from "../auth/lib/config";
import { verifyToken } from "../auth/lib/oidc";
import { getAuthContext } from "../auth/lib/session";
import { isDeployedStage } from "../lib/deploy-stage";
import type { MintOptions } from "../lib/s2s-token";

// Product-owned RP identity, shared with the cloud application's /api/chat.
// The browser sends only its opaque product cookie. Access/S2S tokens remain
// server-side. Console native rpsid and the legacy ruyin bearer are not this
// product's login; desktop handoff remains a separate #198 prerequisite.
// OBO accepts exactly our client audience, including on beta registrations.
export const DEV_WORKSPACE_ID = "ws_local_dev";

export interface CapabilityCaller {
  workspaceId: string;
  sub?: string;
  orgId?: string;
  mint: MintOptions;
}

export interface CallerRefusal {
  status: number;
  error: string;
  code?: string;
  retryable?: boolean;
}

interface CallerOptions {
  method?: string;
  verify?: (token: string, audience: string) => Promise<Record<string, unknown>>;
  session?: (cfg: OidcConfig, rpsid: string) => Promise<Awaited<ReturnType<typeof getAuthContext>>>;
}

function cookieSession(headers: Headers, name: string): string | undefined {
  const values = (headers.get("cookie") ?? "").split(";")
    .map(part => part.trim()).filter(part => part.slice(0, part.indexOf("=")) === name);
  if (values.length !== 1) return;
  try {
    const value = decodeURIComponent(values[0]!.slice(name.length + 1));
    return value && !/[\s,;]/.test(value) ? value : undefined;
  } catch { return; }
}

/** Verify identity before consuming any project/task facts from the request. */
export async function resolveCapabilityCaller(headers: Headers, options: CallerOptions = {}): Promise<CapabilityCaller | CallerRefusal> {
  const cfg = getOidcConfig();
  if (!cfg.enabled) {
    if (isDeployedStage()) return { status: 503, error: "sign-in is not configured on this deployment (OIDC_RP_ENABLED is off)" };
    return { workspaceId: DEV_WORKSPACE_ID, mint: { workspaceId: DEV_WORKSPACE_ID } };
  }

  let token: string;
  const authorization = headers.get("authorization");
  if (authorization !== null) {
    // Explicit credentials never fall back to another user's browser session.
    const bearer = /^Bearer ([^\s,]+)$/i.exec(authorization);
    if (!bearer) return { status: 401, error: "invalid bearer token" };
    token = bearer[1]!;
  } else {
    const rpsid = cookieSession(headers, cfg.cookieName);
    if (!rpsid) return { status: 401, error: "not signed in" };
    const origin = headers.get("origin");
    const write = !["GET", "HEAD", "OPTIONS"].includes((options.method ?? "GET").toUpperCase());
    if (headers.get("sec-fetch-site") === "cross-site" ||
        (write && (!cfg.appOrigin || origin !== cfg.appOrigin)) ||
        (origin !== null && origin !== cfg.appOrigin)) {
      return { status: 403, error: "request origin is not allowed" };
    }
    let session: Awaited<ReturnType<typeof getAuthContext>>;
    try { session = await (options.session ?? getAuthContext)(cfg, rpsid); }
    catch { return { status: 503, error: "sign-in service is temporarily unavailable", code: "SESSION_UNAVAILABLE", retryable: true }; }
    if (!session) return { status: 401, error: "not signed in" };
    token = session.accessToken;
  }

  const verify = options.verify ?? ((value: string, audience: string) => verifyToken(value, cfg, { audience }));
  let claims: Record<string, unknown>;
  try { claims = await verify(token, cfg.clientId); }
  catch { return { status: 401, error: "not a valid product user token" }; }
  // jwtVerify accepts audience arrays, but the platform's OBO contract does not.
  if (claims["aud"] !== cfg.clientId) return { status: 401, error: "token audience does not match this product" };
  const sub = claims["sub"];
  const workspaceId = claims["active_workspace"];
  const orgId = claims["active_org"];
  if (typeof sub !== "string" || !sub.trim()) return { status: 401, error: "token carries no subject" };
  if (claims["account_status"] !== undefined && claims["account_status"] !== "active") {
    return { status: 403, error: "account is not active" };
  }
  if (typeof workspaceId !== "string" || !workspaceId.trim()) return { status: 403, error: "this session has no active workspace" };
  return { workspaceId, sub, ...(typeof orgId === "string" && orgId ? { orgId } : {}), mint: { subjectToken: token } };
}

export function isRefusal(v: CapabilityCaller | CallerRefusal): v is CallerRefusal {
  return "error" in v;
}
