import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntitlementEnvelope } from "./platform-client";

test("tolerates a missing/empty envelope (no-coverage defaults)", () => {
  const e = parseEntitlementEnvelope("ws", "p", {});
  assert.equal(e.tier, null);
  assert.equal(e.status, null);
  assert.equal(e.bundled, false);
  assert.deepEqual(e.limits, {});
  assert.deepEqual(e.quota_pools, []);
});

test("coerces known fields, drops non-number limits and metric-less pools", () => {
  const e = parseEntitlementEnvelope("ws", "p", {
    tier: "pro",
    bundled: true,
    status: "active",
    cancel_at_period_end: true,
    limits: { "member.max": 20, bad: "x" },
    quota_pools: [
      { metric: "ai.credit", limit: 100, remaining: 50, priority: 100 },
      { limit: 1 }, // no metric -> dropped
    ],
    future_field: 123, // unknown -> ignored
  });
  assert.equal(e.tier, "pro");
  assert.equal(e.bundled, true);
  assert.equal(e.cancel_at_period_end, true);
  assert.deepEqual(e.limits, { "member.max": 20 });
  assert.equal(e.quota_pools.length, 1);
  assert.equal(e.quota_pools[0].metric, "ai.credit");
});

test("keeps an unknown future status verbatim (forward tolerance)", () => {
  const e = parseEntitlementEnvelope("ws", "p", { status: "some_future_status" });
  assert.equal(e.status, "some_future_status");
});
