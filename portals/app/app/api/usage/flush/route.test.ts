/**
 * @package @bidproposal/app
 * @layer Application
 * @category Test
 * @author AI-Generated
 * @date 2026-11-24
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route";
import { InMemoryUsageStore, setUsageStore } from "../../../usage/lib/store";

test("the flush endpoint requires its job credential and durable production storage", async t => {
  const names = ["INTERNAL_JOB_TOKEN", "DEPLOY_STAGE", "DATABASE_URL", "PLATFORM_API_URL"] as const;
  const before = Object.fromEntries(names.map(name => [name, process.env[name]]));
  t.after(() => {
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
    setUsageStore(null);
  });
  process.env.DEPLOY_STAGE = "production";
  process.env.INTERNAL_JOB_TOKEN = "synthetic-job-only";
  delete process.env.DATABASE_URL;
  const request = (token?: string) => new Request("http://localhost/api/usage/flush", {
    method: "POST", headers: token ? { "x-internal-job-token": token } : {},
  });
  for (const token of [undefined, "wrong", "wrong-job-token---"]) {
    assert.equal((await POST(request(token))).status, 403);
  }
  assert.equal((await POST(request("synthetic-job-only"))).status, 503);
  process.env.DEPLOY_STAGE = "dev";
  delete process.env.PLATFORM_API_URL;
  setUsageStore(new InMemoryUsageStore());
  const missing = await POST(request("synthetic-job-only"));
  assert.equal(missing.status, 503);
  assert.match(missing.headers.get("cache-control") ?? "", /no-store/);
  delete process.env.INTERNAL_JOB_TOKEN;
  assert.equal((await POST(request("synthetic-job-only"))).status, 403);
});
