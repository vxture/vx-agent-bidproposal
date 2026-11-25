/**
 * Gauge admission regression, including shared usage outside this product.
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_ENTITLEMENT, type Entitlement } from "../entitlement/types";
import { admitStorage, storageBudget } from "./storage-policy";

const entitlement = (limits: Record<string, number> = {}): Entitlement => ({
  ...EMPTY_ENTITLEMENT,
  limits,
  quota_pools: [],
  workspace_id: "workspace",
  product: "bidproposal",
  tier: "starter",
});

test("shared storage uses remaining gauge capacity, never a second product allowance", () => {
  const value = entitlement({ "storage.bytes.max": 1000 });
  value.quota_pools = [
    { metric: "storage.bytes", limit: 100, remaining: 7, priority: 1 },
  ];
  const budget = storageBudget(value);
  assert.deepEqual(budget, { kind: "shared", remaining: 7 });
  admitStorage(budget, 20, 23, 27);
  assert.throws(() => admitStorage(budget, 20, 23, 28), /storage limit/);
  value.quota_pools[0]!.remaining = -10;
  admitStorage(storageBudget(value), 20, 20, 20);
  assert.throws(
    () => admitStorage(storageBudget(value), 20, 20, 21),
    /storage limit/,
  );
});
test("absent metrics use defaults; explicit zero and unlimited remain effective", () => {
  assert.deepEqual(storageBudget(entitlement()), {
    kind: "local",
    limit: 1024 ** 3,
  });
  assert.throws(
    () =>
      admitStorage(
        storageBudget(entitlement({ "storage.bytes.max": 0 })),
        0,
        0,
        1,
      ),
    /storage limit/,
  );
  admitStorage(
    storageBudget(entitlement({ "storage.bytes.max": -1 })),
    0,
    0,
    100000,
  );
  const value = entitlement();
  value.quota_pools = [
    { metric: "storage.bytes", limit: 0, remaining: 0, priority: 1 },
    { metric: "other", limit: 9999, remaining: 9999, priority: 1 },
  ];
  assert.throws(
    () => admitStorage(storageBudget(value), 0, 0, 1),
    /storage limit/,
  );
});
test("multiple gauge rows aggregate safely and malformed present fields fail closed", () => {
  const value = entitlement();
  value.quota_pools = [
    { metric: "storage.bytes", limit: 10, remaining: 5, priority: 1 },
    { metric: "storage.bytes", limit: 20, remaining: 6, priority: 2 },
  ];
  assert.deepEqual(storageBudget(value), { kind: "shared", remaining: 11 });
  for (const patch of [
    { remaining: NaN },
    { remaining: 21 },
    { limit: -2 },
    { remaining: 0.5 },
  ]) {
    const broken = {
      ...value,
      quota_pools: [{ ...value.quota_pools[1]!, ...patch }],
    };
    assert.throws(() => storageBudget(broken), /capacity is unavailable/);
  }
  assert.throws(
    () => storageBudget(entitlement({ "storage.bytes.max": NaN })),
    /capacity is unavailable/,
  );
});
