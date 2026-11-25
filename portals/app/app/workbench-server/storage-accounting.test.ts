/**
 * Persistent retry, concurrent changes and last-write-wins gauge recovery.
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { StorageAccounting } from "./storage-accounting";
import type { GaugeReceipt, StorageObservation } from "../usage/lib/gauge";
function recordStore() {
  let saved: { markdown: string; revision: number } | undefined;
  return {
    getProductDocument: () => saved,
    putProductDocument: (
      _product: string,
      _id: string,
      markdown: string,
      revision: number,
    ) => {
      assert.equal(revision, saved?.revision ?? 0);
      return (saved = { markdown, revision: revision + 1 });
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// --- Durable delivery under partial failure -------------------------------
test("failed delivery survives reconstruction and repeats the exact observation", async () => {
  const store = recordStore(),
    sent: StorageObservation[] = [];
  let accounting = new StorageAccounting(
    store,
    "workspace",
    async (value) => {
      sent.push(value);
      throw Error("offline");
    },
    () => 1000,
  );
  accounting.observe(321);
  await assert.rejects(accounting.flush(), /temporarily unavailable/);
  accounting.close();
  accounting = new StorageAccounting(
    store,
    "workspace",
    async (value) => {
      sent.push(value);
      return { ...value, applied: true };
    },
    () => 900,
  );
  try {
    accounting.observe(321);
    await accounting.flush();
    assert.deepEqual(sent[0], sent[1]);
    await accounting.flush();
    assert.equal(sent.length, 2);
    accounting.observe(0);
    await accounting.flush();
    assert.equal(sent[2]!.value, "0");
    assert.ok(sent[2]!.observed_at > sent[1]!.observed_at);
  } finally {
    accounting.close();
  }
});
test("an in-flight old receipt cannot clear a newer observation; delivery is single-flight", async () => {
  const held = deferred<GaugeReceipt>(),
    started = deferred<StorageObservation>();
  const sent: StorageObservation[] = [],
    store = recordStore();
  const accounting = new StorageAccounting(
    store,
    "workspace",
    async (value) => {
      sent.push(value);
      if (sent.length === 1) {
        started.resolve(value);
        return held.promise;
      }
      return { ...value, applied: true };
    },
    () => 1000,
  );
  try {
    accounting.observe(10);
    const first = accounting.flush(),
      current = await started.promise;
    accounting.observe(20);
    assert.equal(accounting.flush(), first);
    held.resolve({ ...current, applied: true });
    await first;
    assert.deepEqual(
      sent.map((v) => v.value),
      ["10", "20"],
    );
    assert.ok(sent[1]!.observed_at > sent[0]!.observed_at);
  } finally {
    accounting.close();
  }
});
test("superseding platform receipts advance only the observation clock, not local inventory", async () => {
  const sent: StorageObservation[] = [];
  const accounting = new StorageAccounting(
    recordStore(),
    "workspace",
    async (value) => {
      sent.push(value);
      return sent.length === 1
        ? {
            ...value,
            value: "99",
            applied: false,
            observed_at: new Date(2000).toISOString(),
          }
        : { ...value, applied: true };
    },
    () => 1000,
  );
  try {
    accounting.observe(7);
    await accounting.flush();
    assert.equal(sent.length, 2);
    assert.equal(sent[1]!.value, "7");
    assert.ok(Date.parse(sent[1]!.observed_at) > 2000);
  } finally {
    accounting.close();
  }
});
test("shutdown never acknowledges against a closed database", async () => {
  const held = deferred<GaugeReceipt>(),
    started = deferred<StorageObservation>(),
    store = recordStore();
  const accounting = new StorageAccounting(
    store,
    "workspace",
    async (value) => {
      started.resolve(value);
      return held.promise;
    },
  );
  accounting.observe(4);
  const pending = accounting.flush(),
    value = await started.promise;
  accounting.close();
  const revision = store.getProductDocument()!.revision;
  held.resolve({ ...value, applied: true });
  await pending;
  assert.equal(store.getProductDocument()!.revision, revision);
  await assert.rejects(accounting.flush(), /closed/);
});
