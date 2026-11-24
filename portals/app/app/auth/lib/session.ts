/**
 * Product RP resolution with single-flight rotating refresh.
 * @package @bidproposal/app
 * @layer Application
 * @category Session
 * @author AI-Generated
 * @date 2026-11-25
 */
import type { OidcConfig } from "./config";
import { verifyToken, refreshTokens } from "./oidc";
import {
  getSession,
  replaceSessionIfCurrent,
  type RpSession,
} from "./session-store";
import { toAuthUser, type AccessClaims, type AuthUser } from "./claims";

type AuthContext = { user: AuthUser; accessToken: string; idToken: string };
interface SessionPorts {
  read: typeof getSession;
  replace: typeof replaceSessionIfCurrent;
  refresh: typeof refreshTokens;
  verify: typeof verifyToken;
}
const defaultPorts: SessionPorts = {
  read: getSession,
  replace: replaceSessionIfCurrent,
  refresh: refreshTokens,
  verify: verifyToken,
};

// --- Coalesced session resolution -----------------------------------------
/** Create one process-local resolver; raw product tokens remain server-side. */
export function createAuthContextResolver(ports: SessionPorts = defaultPorts) {
  const resolutions = new Map<string, Promise<AuthContext | null>>();
  return async (
    cfg: OidcConfig,
    rpsid: string,
  ): Promise<AuthContext | null> => {
    const key = cfg.clientId + ":" + rpsid;
    const pending = resolutions.get(key);
    if (pending) return pending;
    const next = resolveAuthContext(cfg, rpsid, ports);
    resolutions.set(key, next);
    try {
      return await next;
    } finally {
      if (resolutions.get(key) === next) resolutions.delete(key);
    }
  };
}
export const getAuthContext = createAuthContextResolver();

/** Resolve the product user without exposing its token to a browser response. */
export async function getAuthUser(
  cfg: OidcConfig,
  rpsid: string,
): Promise<AuthUser | null> {
  return (await getAuthContext(cfg, rpsid))?.user ?? null;
}

async function resolveAuthContext(
  cfg: OidcConfig,
  rpsid: string,
  ports: SessionPorts,
): Promise<AuthContext | null> {
  let session = await ports.read(cfg.clientId, rpsid);
  if (!session) return null;
  if (
    session.accessExpiresAt - Math.floor(Date.now() / 1000) <= 60 &&
    session.refreshToken
  ) {
    session = await tryRefresh(cfg, rpsid, session, ports);
    if (!session) return null;
  }
  try {
    const claims = (await ports.verify(
      session.accessToken,
      cfg,
    )) as AccessClaims;
    return {
      user: toAuthUser(claims),
      accessToken: session.accessToken,
      idToken: session.idToken,
    };
  } catch {
    return null;
  }
}

// --- Rotation cannot resurrect a revoked RP session -----------------------
async function tryRefresh(
  cfg: OidcConfig,
  rpsid: string,
  session: RpSession,
  ports: SessionPorts,
): Promise<RpSession | null> {
  try {
    const tokens = await ports.refresh(cfg, session.refreshToken!);
    const next: RpSession = {
      ...session,
      accessToken: tokens.access_token,
      idToken: tokens.id_token ?? session.idToken,
      refreshToken: tokens.refresh_token ?? session.refreshToken,
      accessExpiresAt:
        Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 300),
    };
    return (await ports.replace(
      cfg.clientId,
      rpsid,
      session,
      next,
      cfg.sessionTtlSeconds,
    ))
      ? next
      : null;
  } catch {
    return null;
  }
}
