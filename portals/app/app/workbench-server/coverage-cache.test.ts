/**
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { WorkbenchCoverageCache } from "./coverage-cache";
import { EMPTY_ENTITLEMENT } from "../entitlement/types";
const entitlement = {
  ...EMPTY_ENTITLEMENT,
  product: "bidproposal",
  workspace_id: "workspace",
};
const caller = {
  orgId: "org",
  workspaceId: "workspace",
  sub: "member",
  mint: { subjectToken: "synthetic-token" },
};

test("UI bursts share one coverage read while member, token and workspace scopes stay separate", async () => {
  let time = 0,
    reads = 0;
  const cache = new WorkbenchCoverageCache(() => time);
  const load = async () => {
    reads++;
    return { ...entitlement };
  };
  await Promise.all(Array.from({ length: 40 }, () => cache.read(caller, load)));
  assert.equal(reads, 1);
  await cache.read({ ...caller, sub: "other" }, load);
  await cache.read({ ...caller, workspaceId: "other" }, load);
  await cache.read({ ...caller, mint: { subjectToken: "rotated" } }, load);
  assert.equal(reads, 4);
  time = 10_001;
  await assert.rejects(
    cache.read(caller, async () => {
      throw new Error("C2 unavailable");
    }),
    /unavailable/,
  );
  await cache.read(caller, load);
  assert.equal(reads, 5);
});

test("verified workspace invalidation clears fresh and in-flight decisions", async () => {
  const cache = new WorkbenchCoverageCache();
  let reads = 0,
    release!: () => void;
  const load = async () => {
    reads++;
    return entitlement;
  };
  await cache.read(caller, load);
  cache.invalidate(caller.workspaceId);
  await cache.read(caller, load);
  assert.equal(reads, 2);
  cache.invalidate(caller.workspaceId);
  const gate = new Promise<void>((done) => {
    release = done;
  });
  const pending = cache.read(caller, async () => {
    await gate;
    return entitlement;
  });
  cache.invalidate(caller.workspaceId);
  release();
  await assert.rejects(pending, /changed/);
});
