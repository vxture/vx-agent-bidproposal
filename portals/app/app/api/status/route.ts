import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildStatus, statusMode } from "../../lib/status";
import { getOidcConfig } from "../../auth/lib/config";
import { getAuthUser } from "../../auth/lib/session";

// GET /api/status - the integration-status surface. Gated by STATUS_PAGE:
// off -> 404, authed -> requires a valid session, public -> open. Reports only
// non-secret config (presence booleans + identifiers) plus a short-timeout
// DB/Redis reachability probe. Never returns a secret value (see status.test.ts).
export const dynamic = "force-dynamic";

const PROBE_TIMEOUT_MS = 1000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

async function probeDb(url?: string): Promise<boolean | null> {
  if (!url) return null;
  return withTimeout(
    (async () => {
      const { Client } = await import("pg");
      const c = new Client({ connectionString: url, connectionTimeoutMillis: PROBE_TIMEOUT_MS });
      try {
        await c.connect();
        await c.query("SELECT 1");
        return true;
      } catch {
        return false;
      } finally {
        try {
          await c.end();
        } catch {
          /* ignore */
        }
      }
    })(),
    PROBE_TIMEOUT_MS + 200,
    false,
  );
}

async function probeRedis(url?: string): Promise<boolean | null> {
  if (!url) return null;
  return withTimeout(
    (async () => {
      const { default: Redis } = await import("ioredis");
      const r = new Redis(url, { connectTimeout: PROBE_TIMEOUT_MS, maxRetriesPerRequest: 1, lazyConnect: true });
      try {
        await r.connect();
        await r.ping();
        return true;
      } catch {
        return false;
      } finally {
        r.disconnect();
      }
    })(),
    PROBE_TIMEOUT_MS + 200,
    false,
  );
}

export async function GET(): Promise<Response> {
  const mode = statusMode(process.env);
  if (mode === "off") return new NextResponse("not found", { status: 404 });

  if (mode === "authed") {
    const cfg = getOidcConfig();
    const jar = await cookies();
    const rpsid = jar.get(cfg.cookieName)?.value;
    const user = rpsid ? await getAuthUser(cfg, rpsid).catch(() => null) : null;
    if (!user) return new NextResponse("unauthorized", { status: 401 });
  }

  const status = buildStatus(process.env, new Date().toISOString());
  const [dbReachable, redisReachable] = await Promise.all([
    probeDb(process.env.DATABASE_URL),
    probeRedis(process.env.REDIS_URL),
  ]);
  status.data.database.reachable = dbReachable;
  status.data.redis.reachable = redisReachable;

  return NextResponse.json(status);
}
