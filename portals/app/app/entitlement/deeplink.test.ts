import { test } from "node:test";
import assert from "node:assert/strict";
import { subscribeUrl } from "./deeplink";

test("subscribe URL carries product + intent and never workspace_id", () => {
  const u = new URL(subscribeUrl({ intent: "upgrade", targetTier: "pro", metric: "member.max" }));
  assert.equal(u.pathname, "/subscribe");
  assert.equal(u.searchParams.get("intent"), "upgrade");
  assert.equal(u.searchParams.get("target_tier"), "pro");
  assert.equal(u.searchParams.get("metric"), "member.max");
  assert.notEqual(u.searchParams.get("product"), null);
  assert.equal(u.searchParams.get("workspace_id"), null);
});

test("optional params omitted when not given", () => {
  const u = new URL(subscribeUrl({ intent: "renew" }));
  assert.equal(u.searchParams.get("intent"), "renew");
  assert.equal(u.searchParams.get("target_tier"), null);
  assert.equal(u.searchParams.get("metric"), null);
});
