import { test } from "node:test";
import assert from "node:assert/strict";
import { recordUsage } from "./buffer";
import { InMemoryUsageStore } from "./store";

test("records a counter event and buffers it unflushed", async () => {
  const store = new InMemoryUsageStore();
  await recordUsage({ workspaceId: "ws", metric: "ai.credit", amount: 3, idempotencyKey: "k1" }, store);
  const rows = await store.unflushed(10);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 3);
  assert.equal(rows[0].flushed, false);
});

test("replay with the same idempotency key does not double-count", async () => {
  const store = new InMemoryUsageStore();
  await recordUsage({ workspaceId: "ws", metric: "ai.credit", amount: 3, idempotencyKey: "k1" }, store);
  await recordUsage({ workspaceId: "ws", metric: "ai.credit", amount: 3, idempotencyKey: "k1" }, store);
  assert.equal((await store.unflushed(10)).length, 1);
});

test("rejects a missing idempotency key or non-positive amount", async () => {
  const store = new InMemoryUsageStore();
  await assert.rejects(() =>
    recordUsage({ workspaceId: "ws", metric: "m", amount: 1, idempotencyKey: "" }, store),
  );
  await assert.rejects(() =>
    recordUsage({ workspaceId: "ws", metric: "m", amount: 0, idempotencyKey: "k" }, store),
  );
});
