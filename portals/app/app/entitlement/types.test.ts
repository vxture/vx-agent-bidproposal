import { test } from "node:test";
import assert from "node:assert/strict";
import { hasProductAccess, hasDataAccess, ctaFor, EMPTY_ENTITLEMENT } from "./types";
import type { Entitlement } from "./types";

function ent(over: Partial<Entitlement>): Entitlement {
  return { ...EMPTY_ENTITLEMENT, workspace_id: "ws", product: "p", ...over };
}

test("UI gate = tier != null (bundled does not grant UI access)", () => {
  assert.equal(hasProductAccess(ent({ tier: "pro" })), true);
  assert.equal(hasProductAccess(ent({ tier: null })), false);
  assert.equal(hasProductAccess(ent({ tier: null, bundled: true })), false);
});

test("data gate = tier != null || bundled", () => {
  assert.equal(hasDataAccess(ent({ tier: null, bundled: true })), true);
  assert.equal(hasDataAccess(ent({ tier: "free" })), true);
  assert.equal(hasDataAccess(ent({ tier: null, bundled: false })), false);
});

test("cta branches by status (product_240 2.4 #9)", () => {
  assert.equal(ctaFor(ent({ tier: "pro", status: "active" })), "none");
  assert.equal(ctaFor(ent({ tier: "starter", status: "trialing" })), "none");
  assert.equal(ctaFor(ent({ tier: null, status: null })), "subscribe");
  assert.equal(ctaFor(ent({ tier: "pro", status: "overdue" })), "pay");
  assert.equal(ctaFor(ent({ tier: null, status: "expired" })), "renew");
  assert.equal(ctaFor(ent({ tier: null, status: "cancelled" })), "renew");
  assert.equal(ctaFor(ent({ tier: null, status: "suspended" })), "renew");
});

test("bundled-but-no-direct-purchase = subscribe CTA, still has data access", () => {
  const e = ent({ tier: null, status: null, bundled: true });
  assert.equal(ctaFor(e), "subscribe");
  assert.equal(hasDataAccess(e), true);
  assert.equal(hasProductAccess(e), false);
});
