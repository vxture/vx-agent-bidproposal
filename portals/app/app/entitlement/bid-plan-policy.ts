import { limitOf } from "./quota";
import type { Entitlement, Tier } from "./types";

const PROPOSAL_LIMIT = "proposal.max";
const COMPARISON_LIMIT = "comparison.monthly.max";

export interface BidPlanPolicy {
  /** Number of proposals kept in a workspace. -1 means unlimited. */
  proposalLimit: number;
  /** Completed comparison reports allowed per workspace per month. */
  monthlyComparisonLimit: number;
}

const DEFAULT_LIMITS: Record<Tier, BidPlanPolicy> = {
  free: { proposalLimit: 1, monthlyComparisonLimit: 0 },
  starter: { proposalLimit: 1_000, monthlyComparisonLimit: 6 },
  pro: { proposalLimit: 1_000, monthlyComparisonLimit: 12 },
  business: { proposalLimit: 1_000, monthlyComparisonLimit: 1_000 },
  enterprise: { proposalLimit: 0, monthlyComparisonLimit: 0 },
};

function plannedLimit(entitlement: Entitlement, metric: string, fallback: number): number {
  const value = limitOf(entitlement, metric);
  if (value === undefined) return fallback;
  // An invalid value must not turn into a higher default. Zero is deliberate.
  return Number.isSafeInteger(value) && value >= -1 ? value : 0;
}

/** Interpret product limits from a verified workspace entitlement. */
export function getBidPlanPolicy(entitlement: Entitlement): BidPlanPolicy | null {
  const { tier } = entitlement;
  if (entitlement.product !== "bidproposal" || !tier || !Object.hasOwn(DEFAULT_LIMITS, tier)) return null;
  const defaults = DEFAULT_LIMITS[tier];
  return {
    proposalLimit: plannedLimit(entitlement, PROPOSAL_LIMIT, defaults.proposalLimit),
    monthlyComparisonLimit: tier === "free"
      ? 0
      : plannedLimit(entitlement, COMPARISON_LIMIT, defaults.monthlyComparisonLimit),
  };
}
