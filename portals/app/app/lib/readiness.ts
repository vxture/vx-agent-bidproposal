/**
 * readiness.ts - Read-only product dependency checks without diagnostic leakage.
 * @package @bidproposal/app
 * @layer Application
 * @category service
 * @author AI-Generated
 * @date 2026-11-24
 */
import { BRAND } from "@bidproposal/shared/brand";
import { assertInternalTarget } from "./internal-target";

type Environment = Record<string, string | undefined>;
type Check = "ok" | "fail";
export interface ReadinessChecks {
  configuration: Check;
  db: Check;
  redis: Check;
}
export interface ReadinessProbes {
  database(url: string): Promise<boolean>;
  redis(url: string): Promise<boolean>;
}

const TIMEOUT_MS = 2_000;

// ============================================================================
// Configuration and bounded dependency adapters
// ============================================================================

function configured(env: Environment): boolean {
  try {
    const origin = new URL(env.NEXT_PUBLIC_APP_URL ?? "");
    const issuer = new URL(env.OIDC_ISSUER ?? "");
    if ([origin, issuer].some((url) => url.protocol !== "https:" || url.username || url.password || url.search || url.hash)) return false;
    if (origin.pathname !== "/" || issuer.pathname !== "/") return false;
    if (env.OIDC_RP_ENABLED !== "on" || env.OIDC_CLIENT_ID !== BRAND.productCode || !env.OIDC_CLIENT_SECRET?.trim()) return false;
    if (env.OIDC_REDIRECT_URI !== origin.origin + "/auth/callback" || env.OIDC_POST_LOGOUT_REDIRECT_URI !== origin.origin + "/") return false;
    if (!env.PROVISION_WEBHOOK_SECRET || env.PROVISION_WEBHOOK_SECRET.length < 16) return false;
    if (env.ALLOW_MOCK_ON_DEPLOY || env.PLATFORM_INTERNAL_AUTH_TOKEN) return false;
    for (const key of ["PLATFORM_API_URL", "ATLAS_API_URL", "RUNOS_API_URL"] as const) {
      const url = assertInternalTarget(env[key] ?? "");
      if (url.username || url.password || url.search || url.hash) return false;
    }
    const db = new URL(env.DATABASE_URL ?? "");
    const redis = new URL(env.REDIS_URL ?? "");
    return ["postgres:", "postgresql:"].includes(db.protocol) &&
      decodeURIComponent(db.username) === BRAND.productCode + "_svc" && Boolean(db.password) &&
      ["redis:", "rediss:"].includes(redis.protocol);
  } catch {
    return false;
  }
}

async function probeDatabase(url: string): Promise<boolean> {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url, connectionTimeoutMillis: TIMEOUT_MS,
    query_timeout: TIMEOUT_MS, statement_timeout: TIMEOUT_MS - 250 });
  // Socket failures must remain a failed check, never an unhandled process error.
  client.on("error", () => undefined);
  return bounded(async () => {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const identity = await client.query<{ name: string; privileged: boolean }>(
      "SELECT current_user AS name, (rolsuper OR rolcreatedb OR rolcreaterole) AS privileged FROM pg_roles WHERE rolname = current_user",
    );
    if (identity.rows[0]?.name !== BRAND.productCode + "_svc" || identity.rows[0]?.privileged !== false) return false;
    // SELECT 1 cannot detect a missing bootstrap, inaccessible columns or wrong role.
    await client.query("SELECT delivery_id, type, occurred_at, result FROM vx_provision.webhook_delivery LIMIT 0");
    await client.query("SELECT workspace_id, product_code, status FROM vx_provision.app_instance LIMIT 0");
    await client.query("SELECT workspace_id, product_code, last_seq FROM vx_provision.provision_seq LIMIT 0");
    return true;
  }, () => client.end());
}

async function probeRedis(url: string): Promise<boolean> {
  const { default: Redis } = await import("ioredis");
  const client = new Redis(url, { lazyConnect: true, connectTimeout: TIMEOUT_MS,
    commandTimeout: TIMEOUT_MS, maxRetriesPerRequest: 0, retryStrategy: () => null,
    enableOfflineQueue: false });
  client.on("error", () => undefined);
  return bounded(async () => {
    await client.connect();
    return await client.ping() === "PONG";
  }, async () => { client.disconnect(); });
}

async function bounded(check: () => Promise<boolean>, close: () => Promise<void>): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Bound connect and query together; a timeout also closes the active socket.
    return await Promise.race([
      check().catch(() => false),
      new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(timer);
    await close().catch(() => undefined);
  }
}

// ============================================================================
// Public result: fixed status words only, never connection details or exceptions
// ============================================================================

/**
 * Check product-owned dependencies without reading customer rows or minting tokens.
 * @param env - Supported runtime configuration, without development fallbacks.
 * @param probes - Read-only dependency adapters.
 * @returns Per-dependency statuses safe to expose through the standard readiness path.
 */
export async function readinessChecks(
  env: Environment = process.env,
  probes: ReadinessProbes = { database: probeDatabase, redis: probeRedis },
): Promise<ReadinessChecks> {
  const run = async (url: string | undefined, probe: (value: string) => Promise<boolean>): Promise<Check> => {
    if (!url) return "fail";
    try { return await probe(url) ? "ok" : "fail"; } catch { return "fail"; }
  };
  const [db, redis] = await Promise.all([
    run(env.DATABASE_URL, probes.database), run(env.REDIS_URL, probes.redis),
  ]);
  return { configuration: configured(env) ? "ok" : "fail", db, redis };
}
