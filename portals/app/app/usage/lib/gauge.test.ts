/**
 * Exact C3 wire shape and receipt refusal tests, without network access.
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { makePlatformGauge, type StorageObservation } from "./gauge";
const observation: StorageObservation = {
  workspace_id: "11111111-1111-4111-8111-111111111111",
  product: "bidproposal",
  metric: "storage.bytes",
  value: "123",
  observed_at: "2026-11-25T00:00:00.000Z",
};

// --- Wire format and strict acknowledgments -------------------------------
test("storage reports use absolute PUT gauge with scoped server-side service identity", async () => {
  const report = makePlatformGauge(
    "http://platform-api:3000",
    async (workspace) => {
      assert.equal(workspace, observation.workspace_id);
      return "server-only-test-token";
    },
    async (url, init) => {
      assert.equal(String(url), "http://platform-api:3000/usage/gauge");
      assert.equal(init?.method, "PUT");
      assert.deepEqual(JSON.parse(String(init?.body)), observation);
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer server-only-test-token",
      );
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      assert.ok(init?.signal);
      return Response.json({ ...observation, applied: true });
    },
  );
  assert.equal((await report(observation)).applied, true);
});
test("HTTP success alone cannot acknowledge a different scope, metric, value or observation", async () => {
  for (const body of [
    null,
    {},
    { ...observation },
    { ...observation, applied: "true" },
    { ...observation, applied: true, workspace_id: "other" },
    { ...observation, applied: true, product: "other" },
    { ...observation, applied: true, metric: "counter" },
    { ...observation, applied: true, value: "124" },
    { ...observation, applied: true, observed_at: "2026-11-24T00:00:00Z" },
    { ...observation, applied: false, value: "NaN" },
  ]) {
    const report = makePlatformGauge(
      "http://platform-api",
      async () => "token",
      async () => Response.json(body),
    );
    await assert.rejects(report(observation), /receipt/);
  }
  for (const status of [400, 401, 403, 429, 500]) {
    const report = makePlatformGauge(
      "http://platform-api",
      async () => "token",
      async () => new Response("", { status }),
    );
    await assert.rejects(report(observation), /not acknowledged/);
  }
});
test("a newer last-write-wins receipt is returned for reconciliation, never claimed as our applied value", async () => {
  const receipt = {
    ...observation,
    value: "456",
    observed_at: "2026-11-25T00:00:01Z",
    applied: false,
  };
  const report = makePlatformGauge(
    "http://platform-api",
    async () => "token",
    async () => Response.json(receipt),
  );
  assert.deepEqual(await report(observation), receipt);
  await assert.rejects(
    report({ ...observation, product: "other" }),
    /Invalid storage observation/,
  );
});
