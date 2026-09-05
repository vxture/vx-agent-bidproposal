import { getOidcConfig } from "../auth/lib/config";
import { verifyToken } from "../auth/lib/oidc";
import { isDeployedStage } from "../lib/deploy-stage";
import type { MintOptions } from "../lib/s2s-token";

// Who is calling the capability surface.
//
// The caller is the Ruyin runtime daemon on the user's machine (vxture-ruyin
// ADR-009 / ADR-020). It is a zero-secret public client, so it cannot present a
// product credential; what it presents is the SIGNED-IN USER's platform access
// token (`platform.bearerToken()` in ruyin's local-host). That token is verified
// here against the platform issuer, and it then becomes the `subject_token` of
// every OBO exchange bidproposal performs downstream (Atlas, Runos) - which is exactly
// how the browser path in api/chat works, minus the cookie.
//
// The one thing this module must not do is trust a body field for identity.
// ruyin sends `projectId` (its LOCAL container id) for correlation only; the
// workspace and the subject come from the verified token and nowhere else.

/**
 * The audience ruyin's user token is minted for. ruyin is registered as its own
 * native/public OIDC client, so the token's `aud` is ruyin's client id, not
 * bidproposal's. Which id that is belongs to platform registration, not to this repo -
 * hence an env with a documented default rather than a constant.
 *
 * OPEN INTEGRATION POINT (docs/20-specs/30-capability-surface.md section 4):
 * whether the platform's token-exchange accepts a subject_token whose `aud` is
 * another RP has to be confirmed against the platform, not assumed here.
 */
export const RUYIN_CLIENT_ID_ENV = "RUYIN_CLIENT_ID";
const DEFAULT_RUYIN_CLIENT_ID = "ruyin";

/** Stand-in caller for local development with no IdP. Unreachable on a deployed stage. */
export const DEV_WORKSPACE_ID = "ws_local_dev";

export interface CapabilityCaller {
  workspaceId: string;
  /** End-user subject; absent only on the dev stand-in. */
  sub?: string;
  /** How to mint S2S tokens for this caller (OBO when we have their token). */
  mint: MintOptions;
}

export interface CallerRefusal {
  status: number;
  error: string;
}

function bearerOf(headers: Headers): string | null {
  const raw = headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? m[1].trim() : null;
}

/**
 * Resolve the caller from the request, or say why there is none.
 *
 * `verify` is injectable so tests can hand in a local key; production uses the
 * platform JWKS through `verifyToken`.
 */
export async function resolveCapabilityCaller(
  headers: Headers,
  verify: (token: string, audience: string) => Promise<Record<string, unknown>> = async (token, audience) =>
    verifyToken(token, getOidcConfig(), { audience }) as Promise<Record<string, unknown>>,
): Promise<CapabilityCaller | CallerRefusal> {
  const cfg = getOidcConfig();
  if (!cfg.enabled) {
    if (isDeployedStage()) {
      return { status: 503, error: "sign-in is not configured on this deployment (OIDC_RP_ENABLED is off)" };
    }
    // Local development: no IdP, no token to verify. Same posture as api/chat.
    return { workspaceId: DEV_WORKSPACE_ID, mint: { workspaceId: DEV_WORKSPACE_ID } };
  }

  const token = bearerOf(headers);
  if (!token) return { status: 401, error: "missing bearer token" };

  const audience = process.env[RUYIN_CLIENT_ID_ENV] || DEFAULT_RUYIN_CLIENT_ID;
  let claims: Record<string, unknown>;
  try {
    claims = await verify(token, audience);
  } catch {
    return { status: 401, error: "bearer token is not a valid platform user token" };
  }

  const sub = typeof claims["sub"] === "string" ? (claims["sub"] as string) : undefined;
  const workspaceId =
    typeof claims["active_workspace"] === "string" ? (claims["active_workspace"] as string) : undefined;
  if (!sub) return { status: 401, error: "token carries no subject" };
  if (!workspaceId) return { status: 403, error: "this session has no active workspace" };

  return {
    workspaceId,
    sub,
    // On-behalf-of: downstream reads workspace and subject FROM this token;
    // nothing bidproposal declares can widen it. Runos additionally requires the `sub`
    // that only an OBO token carries.
    mint: { subjectToken: token },
  };
}

export function isRefusal(v: CapabilityCaller | CallerRefusal): v is CallerRefusal {
  return "error" in v;
}
