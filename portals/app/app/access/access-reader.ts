/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Entry
 * @author AI-Generated
 * @date 2026-11-24
 */
import type { AccessState } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reject malformed responses rather than rendering an invented access verdict. */
function parseAccess(value: unknown): AccessState {
  if (!isRecord(value)) throw new Error("Invalid access response");
  if (["anonymous", "inactive-account", "unconfigured", "unavailable", "unassigned"].includes(String(value.status))) {
    return value as unknown as AccessState;
  }
  if (value.status === "open" && value.reason === "dev-no-oidc") return { status: "open", reason: "dev-no-oidc" };
  if (value.status === "no-workspace" && isRecord(value.user)) return value as unknown as AccessState;
  if (value.status === "authenticated" && isRecord(value.user) && typeof value.user.sub === "string" &&
    isRecord(value.gates) && typeof value.gates.productAccess === "boolean" && typeof value.gates.dataAccess === "boolean" &&
    isRecord(value.entitlement) && (value.entitlement.status === null || typeof value.entitlement.status === "string") &&
    (value.entitlement.tier === null || typeof value.entitlement.tier === "string") && typeof value.entitlement.bundled === "boolean") {
    return value as unknown as AccessState;
  }
  throw new Error("Invalid access response");
}

/** Coalesce reads, including React remounts; never race rotating refresh tokens. */
export function createAccessReader(fetcher: typeof fetch, timeoutMs = 15_000): () => Promise<AccessState> {
  let pending: Promise<AccessState> | null = null;
  return () => {
    if (pending) return pending;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const request: Promise<AccessState> = Promise.resolve().then(async () => {
      try {
        const response = await fetcher("/api/access", { cache: "no-store", signal: controller.signal });
        if (!response.ok && response.status !== 503) throw new Error("Access check failed");
        const state = parseAccess(await response.json());
        if (!response.ok && state.status !== "unavailable") throw new Error("Access check failed");
        return state;
      } finally {
        clearTimeout(timer);
        if (pending === request) pending = null;
      }
    });
    pending = request;
    return request;
  };
}

export const readAccess = createAccessReader((...args) => fetch(...args));
