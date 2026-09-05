import { test } from "node:test";
import assert from "node:assert/strict";
import { handleProvisioning, type ProvisioningEvent } from "./handler";
import { InMemoryProvisioningStore } from "./store";

const PRODUCT = "raven";

function ev(over: Partial<ProvisioningEvent>): ProvisioningEvent {
  return {
    id: "d1",
    type: "tenant.provisioned",
    seq: 1,
    workspace_id: "ws_1",
    application: PRODUCT,
    ...over,
  };
}

function deps(over: Partial<Parameters<typeof handleProvisioning>[1]> = {}) {
  return { store: new InMemoryProvisioningStore(), product: PRODUCT, ...over };
}

test("provisioned is handled once; a duplicate delivery is a no-op", async () => {
  const d = deps();
  const first = await handleProvisioning(ev({ id: "d1", seq: 1 }), d);
  assert.equal(first.handled, true);
  const dup = await handleProvisioning(ev({ id: "d1", seq: 1 }), d);
  assert.equal(dup.handled, false);
  assert.equal(dup.reason, "duplicate");
});

test("a stale/earlier seq is ignored", async () => {
  const d = deps();
  await handleProvisioning(ev({ id: "a", seq: 5 }), d);
  const stale = await handleProvisioning(ev({ id: "b", seq: 3 }), d);
  assert.equal(stale.handled, false);
  assert.equal(stale.reason, "stale");
});

test("an event for another product is rejected", async () => {
  const res = await handleProvisioning(ev({ application: "other" }), deps());
  assert.equal(res.reason, "wrong-product");
});

test("subscription_changed evicts the C2 cache", async () => {
  let evicted: string | null = null;
  await handleProvisioning(
    ev({ id: "s1", type: "subscription_changed", seq: 2, workspace_id: "ws_9" }),
    deps({ onSubscriptionChanged: (ws) => (evicted = ws) }),
  );
  assert.equal(evicted, "ws_9");
});

test("provisioned runs the re-entrant init hook", async () => {
  let inited: string | null = null;
  const res = await handleProvisioning(
    ev({ id: "p1", type: "tenant.provisioned" }),
    deps({ onProvisioned: (ws) => { inited = ws; } }),
  );
  assert.equal(res.handled, true);
  assert.equal(inited, "ws_1");
});
