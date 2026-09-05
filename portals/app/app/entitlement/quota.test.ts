import { test } from "node:test";
import assert from "node:assert/strict";
import { withinCap, poolRemaining, isUnlimited, limitOf } from "./quota";
import { EMPTY_ENTITLEMENT, type Entitlement } from "./types";

function ent(over: Partial<Entitlement>): Entitlement {
  return { ...EMPTY_ENTITLEMENT, workspace_id: "ws", product: "p", ...over };
}

test("withinCap admits below the cap, denies at/above", () => {
  const e = ent({ limits: { "member.max": 3 } });
  assert.equal(withinCap(e, "member.max", 2), true);
  assert.equal(withinCap(e, "member.max", 3), false);
});

test("-1 is unlimited", () => {
  assert.equal(isUnlimited(-1), true);
  assert.equal(withinCap(ent({ limits: { "member.max": -1 } }), "member.max", 999999), true);
});

test("absent cap denies by default (fail-closed) unless a default is given", () => {
  assert.equal(withinCap(ent({}), "member.max", 0), false);
  assert.equal(withinCap(ent({}), "member.max", 0, { defaultWhenAbsent: 1 }), true);
});

test("limitOf and poolRemaining", () => {
  assert.equal(limitOf(ent({ limits: { "dataset.max": 500 } }), "dataset.max"), 500);
  assert.equal(limitOf(ent({}), "dataset.max"), undefined);
  const e = ent({ quota_pools: [{ metric: "ai.credit", limit: 100, remaining: 40, priority: 100 }] });
  assert.equal(poolRemaining(e, "ai.credit"), 40);
  assert.equal(poolRemaining(e, "nope"), 0);
});
