/**
 * Coalesce short-lived UI coverage reads without caching execution authority.
 * @package @bidproposal/app
 * @layer Application
 * @category RuntimeIdentity
 * @author AI-Generated
 * @date 2026-11-25
 */
import { createHash } from "node:crypto";
import type { CapabilityCaller } from "../capability/caller";
import type { Entitlement } from "../entitlement/types";
interface Entry {
  workspace: string;
  expires: number;
  value?: Entitlement;
  pending?: Promise<Entitlement>;
}

// --- UI-only bounded snapshots, invalidated by the verified C3 receiver -----
export class WorkbenchCoverageCache {
  private readonly entries = new Map<string, Entry>();
  constructor(
    private readonly now = Date.now,
    private readonly ttlMs = 10_000,
  ) {}
  read(
    caller: CapabilityCaller,
    load: () => Promise<Entitlement>,
  ): Promise<Entitlement> {
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          caller.orgId,
          caller.workspaceId,
          caller.sub,
          caller.mint.subjectToken,
        ]),
      )
      .digest("hex");
    const hit = this.entries.get(key);
    if (hit?.value && hit.expires > this.now())
      return Promise.resolve(hit.value);
    if (hit?.pending) return hit.pending;
    for (const [id, entry] of this.entries)
      if (!entry.pending && entry.expires <= this.now())
        this.entries.delete(id);
    if (this.entries.size >= 256) return load();
    const entry: Entry = { workspace: caller.workspaceId, expires: 0 };
    const pending = load()
      .then((value) => {
        if (this.entries.get(key) !== entry)
          throw new Error("Workspace coverage changed while being read");
        entry.value = value;
        entry.expires = this.now() + this.ttlMs;
        delete entry.pending;
        return value;
      })
      .catch((error) => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
        throw error;
      });
    entry.pending = pending;
    this.entries.set(key, entry);
    return pending;
  }
  invalidate(workspace: string): void {
    for (const [key, entry] of this.entries)
      if (entry.workspace === workspace) this.entries.delete(key);
  }
}
const state = globalThis as typeof globalThis & {
  bidWorkbenchCoverageCache?: WorkbenchCoverageCache;
};
export const workbenchCoverage = (state.bidWorkbenchCoverageCache ??=
  new WorkbenchCoverageCache());
