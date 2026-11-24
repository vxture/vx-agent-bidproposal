import { test } from "node:test";
import assert from "node:assert/strict";
import { flushUsage, makePlatformConsume } from "./flush";
import { InMemoryUsageStore } from "./store";

async function seeded(): Promise<InMemoryUsageStore> {
  const s = new InMemoryUsageStore();
  await s.record({ workspaceId: "ws", metric: "ai.credit", amount: 1, idempotencyKey: "k1" });
  await s.record({ workspaceId: "ws", metric: "ai.credit", amount: 2, idempotencyKey: "k2" });
  return s;
}

test("200 marks rows flushed", async () => {
  const store = await seeded();
  const summary = await flushUsage({ store, consume: async row => ({ status: 200, body: { event_id: `evt_${row.idempotencyKey}` } }) });
  assert.equal(summary.flushed, 2);
  assert.equal((await store.unflushed(10)).length, 0);
});

// The consume contract (integration general rules, C3 up): ALWAYS 200; gated
// rides in the body as information. The old 409 shape is retired.
test("200 + gated:true is recorded (flushed), counted, and evicts C2", async () => {
  const store = await seeded();
  const evicted: string[] = [];
  const summary = await flushUsage({
    store,
    consume: async () => ({ status: 200, body: { gated: true, reason: "quota_exhausted", event_id: "evt_gated" } }),
    onGated: (ws) => evicted.push(ws),
  });
  assert.equal(summary.flushed, 2);
  assert.equal(summary.gated, 2);
  assert.equal((await store.unflushed(10)).length, 0); // recorded, not retried
  assert.deepEqual(evicted, ["ws", "ws"]);
});

test("200 + replayed:true counts the idempotent redo", async () => {
  const store = await seeded();
  const summary = await flushUsage({
    store,
    consume: async () => ({ status: 200, body: { replayed: true, event_id: "evt_1" } }),
  });
  assert.equal(summary.flushed, 2);
  assert.equal(summary.replayed, 2);
  assert.equal(summary.gated, 0);
});

test("non-200 (409 included - the retired shape) leaves rows buffered for retry", async () => {
  const store = await seeded();
  const summary = await flushUsage({ store, consume: async () => ({ status: 409 }) });
  assert.equal(summary.retried, 2);
  assert.equal(summary.flushed, 0);
  assert.equal((await store.unflushed(10)).length, 2); // still buffered
});

test("5xx leaves rows buffered for retry", async () => {
  const store = await seeded();
  const summary = await flushUsage({ store, consume: async () => ({ status: 500 }) });
  assert.equal(summary.retried, 2);
  assert.equal((await store.unflushed(10)).length, 2);
});

test("a thrown consume error leaves rows buffered", async () => {
  const store = await seeded();
  const summary = await flushUsage({
    store,
    consume: async () => {
      throw new Error("network");
    },
  });
  assert.equal(summary.retried, 2);
  assert.equal((await store.unflushed(10)).length, 2);
});

test("product C3 reports through workspace-bound S2S without the shared credential", async t => {
  const workspaces: string[] = [];
  const calls: Array<{ headers: Headers; body: Record<string, unknown> }> = [];
  t.mock.method(globalThis, "fetch", async (_url: string | URL | Request, options: RequestInit) => {
    assert.equal(String(_url), "http://127.0.0.1:9999/usage/consume");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    calls.push({ headers: new Headers(options.headers), body: JSON.parse(String(options.body)) });
    return Response.json({ event_id: "evt_usage", replayed: false, gated: false });
  });
  const consume = makePlatformConsume({ baseUrl: "http://127.0.0.1:9999/", product: "bidproposal" }, async workspaceId => {
    workspaces.push(workspaceId);
    return `synthetic-ticket-${workspaceId}`;
  });
  const row = { workspaceId: "ws-a", metric: "synthetic.operation", amount: 1, idempotencyKey: "operation-1", endUserId: "usr_test", flushed: false };
  assert.equal((await consume(row)).body?.event_id, "evt_usage");
  await consume({ ...row, workspaceId: "ws-b", idempotencyKey: "operation-2" });
  assert.deepEqual(workspaces, ["ws-a", "ws-b"]);
  assert.equal(calls[0].headers.get("authorization"), "Bearer synthetic-ticket-ws-a");
  assert.equal(calls[1].headers.get("authorization"), "Bearer synthetic-ticket-ws-b");
  assert.equal(calls[0].headers.get("x-vxture-internal-auth"), null);
  assert.equal(calls[0].headers.get("x-request-id"), "operation-1");
  assert.deepEqual(calls[0].body, { workspace_id: "ws-a", product: "bidproposal", metric: "synthetic.operation", amount: 1, idempotency_key: "operation-1", end_user_id: "usr_test" });
});

test("foreign product configuration is rejected before minting or sending", async () => {
  const consume = makePlatformConsume({ baseUrl: "http://127.0.0.1:9999", product: "foreign" }, async () => { throw new Error("must not mint"); });
  const row = { workspaceId: "ws-a", metric: "synthetic.operation", amount: 1, idempotencyKey: "operation-1", flushed: false };
  await assert.rejects(consume(row), /Usage product mismatch/);
});
