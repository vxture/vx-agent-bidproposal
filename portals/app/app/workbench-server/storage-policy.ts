/**
 * Retained-byte admission against the verified C2 gauge view.
 * @package @bidproposal/app
 * @layer Application
 * @category StoragePolicy
 * @author AI-Generated
 * @date 2026-11-25
 */
import type { Entitlement, QuotaPool } from "../entitlement/types";
import { WorkbenchError } from "./identity";

// --- Capacity interpretation ----------------------------------------------
export type StorageBudget =
  | { kind: "shared"; remaining: number }
  | { kind: "local"; limit: number };

function poolRemaining(pool: QuotaPool): number {
  if (
    !Number.isSafeInteger(pool.limit) ||
    pool.limit < -1 ||
    !Number.isSafeInteger(pool.remaining) ||
    (pool.limit !== -1 && pool.remaining > pool.limit)
  )
    return invalid();
  return pool.remaining;
}

/** Read platform gauge capacity first; absent metrics retain the product defaults. */
export function storageBudget(entitlement: Entitlement): StorageBudget {
  const pools = entitlement.quota_pools.filter(
    (p) => p.metric === "storage.bytes",
  );
  if (pools.length) {
    const remaining = pools.reduce((sum, pool) => sum + poolRemaining(pool), 0);
    if (!Number.isSafeInteger(remaining)) return invalid();
    if (pools.some((p) => p.limit === -1)) return { kind: "local", limit: -1 };
    return { kind: "shared", remaining };
  }
  const limit = entitlement.limits["storage.bytes.max"];
  if (limit !== undefined) {
    if (!Number.isSafeInteger(limit) || limit < -1) return invalid();
    return { kind: "local", limit };
  }
  return {
    kind: "local",
    limit: {
      free: 100 * 1024 ** 2,
      starter: 1024 ** 3,
      pro: 3 * 1024 ** 3,
      business: 10 * 1024 ** 3,
      enterprise: 0,
    }[entitlement.tier ?? "enterprise"],
  };
}
function invalid(): never {
  throw new WorkbenchError(
    503,
    "STORAGE_BUDGET_UNAVAILABLE",
    "Workspace storage capacity is unavailable",
  );
}

// --- Deduplicated local admission -----------------------------------------
/** Include locally reserved exports, but never block unchanged retained content. */
export function admitStorage(
  budget: StorageBudget,
  actual: number,
  reserved: number,
  proposed: number,
): void {
  if (
    ![actual, reserved, proposed].every(
      (v) => Number.isSafeInteger(v) && v >= 0,
    ) ||
    reserved < actual ||
    proposed < reserved
  )
    return invalid();
  if (proposed === reserved) return;
  const refused =
    budget.kind === "shared"
      ? proposed - actual > budget.remaining
      : budget.limit !== -1 && proposed > budget.limit;
  if (refused)
    throw new WorkbenchError(
      403,
      "STORAGE_LIMIT",
      "The workspace storage limit has been reached",
    );
}
