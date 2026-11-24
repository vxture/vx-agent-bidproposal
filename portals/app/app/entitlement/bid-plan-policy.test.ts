import assert from "node:assert/strict";
import test from "node:test";
import { getBidPlanPolicy } from "./bid-plan-policy";
import { EMPTY_ENTITLEMENT, type Entitlement } from "./types";

function entitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return { ...EMPTY_ENTITLEMENT, product: "bidproposal", workspace_id: "ws-bid", ...overrides };
}

test("uses defaults only for missing limits, keeping zero and unlimited distinct", () => {
  assert.deepEqual(getBidPlanPolicy(entitlement({ tier: "starter" })), {
    proposalLimit: 1_000,
    monthlyComparisonLimit: 6,
  });
  assert.deepEqual(getBidPlanPolicy(entitlement({
    tier: "business", limits: { "proposal.max": -1, "comparison.monthly.max": 0 },
  })), { proposalLimit: -1, monthlyComparisonLimit: 0 });
  assert.deepEqual(getBidPlanPolicy(entitlement({
    tier: "pro", limits: { "proposal.max": 4, "comparison.monthly.max": 12 },
  })), { proposalLimit: 4, monthlyComparisonLimit: 12 });
});

test("free comparison stays unavailable; an unset enterprise contract grants no allowance", () => {
  assert.deepEqual(getBidPlanPolicy(entitlement({
    tier: "free", limits: { "comparison.monthly.max": -1 },
  })), { proposalLimit: 1, monthlyComparisonLimit: 0 });
  assert.deepEqual(getBidPlanPolicy(entitlement({ tier: "enterprise" })), {
    proposalLimit: 0,
    monthlyComparisonLimit: 0,
  });
});

test("rejects unentitled, foreign and unknown tiers and fails closed on invalid limits", () => {
  assert.equal(getBidPlanPolicy(entitlement()), null);
  assert.equal(getBidPlanPolicy(entitlement({ bundled: true })), null);
  assert.equal(getBidPlanPolicy(entitlement({ product: "tenderforge", tier: "pro" })), null);
  assert.equal(getBidPlanPolicy(entitlement({ tier: "future" as Entitlement["tier"] })), null);
  assert.deepEqual(getBidPlanPolicy(entitlement({
    tier: "business", limits: { "proposal.max": -2, "comparison.monthly.max": 1.5 },
  })), { proposalLimit: 0, monthlyComparisonLimit: 0 });
});
