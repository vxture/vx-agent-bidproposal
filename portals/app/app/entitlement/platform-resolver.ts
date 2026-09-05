import type { EntitlementResolver } from "./resolver";
import { makeEntitlement } from "./resolver";
import { fetchEntitlement, type PlatformClientConfig } from "./platform-client";
import type { Entitlement } from "./types";

// Real C2 resolver: short-TTL cache + C3 invalidate (product_200 section 3).
// entitlement is derived live, cached ~45s, and evicted on a subscription_changed
// webhook. Never persisted, never in the token. Stale-on-error keeps the UI up
// if the platform blips.

const TTL_MS = 45_000;

interface Entry {
  value: Entitlement;
  expiresAt: number;
}

export class PlatformEntitlementResolver implements EntitlementResolver {
  private cache = new Map<string, Entry>();

  constructor(private readonly cfg: PlatformClientConfig) {}

  async resolve(workspaceId: string): Promise<Entitlement> {
    const now = Date.now();
    const hit = this.cache.get(workspaceId);
    if (hit && hit.expiresAt > now) return hit.value;

    try {
      const value = await fetchEntitlement(this.cfg, workspaceId);
      this.cache.set(workspaceId, { value, expiresAt: now + TTL_MS });
      return value;
    } catch {
      // Stale-on-error: last good value, else a no-coverage default (fail-closed
      // to no access, not fail-open).
      if (hit) return hit.value;
      return makeEntitlement(workspaceId, this.cfg.product);
    }
  }

  invalidate(workspaceId: string): void {
    this.cache.delete(workspaceId);
  }
}
