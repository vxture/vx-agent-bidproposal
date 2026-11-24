/**
 * readiness.test.ts - Readiness refusal, configuration and non-disclosure contracts.
 * @package @bidproposal/app
 * @layer Application
 * @category test
 * @author AI-Generated
 * @date 2026-11-24
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readinessChecks, type ReadinessProbes } from "./readiness";
import { GET as readyRoute } from "../api/ready/route";
import { GET as liveRoute } from "../api/health/route";

const env = {
  NEXT_PUBLIC_APP_URL: "https://bid.example", OIDC_ISSUER: "https://accounts.example",
  OIDC_CLIENT_ID: "bidproposal", OIDC_CLIENT_SECRET: "synthetic-client-credential",
  OIDC_REDIRECT_URI: "https://bid.example/auth/callback", OIDC_POST_LOGOUT_REDIRECT_URI: "https://bid.example/",
  OIDC_RP_ENABLED: "on", PROVISION_WEBHOOK_SECRET: "synthetic-webhook-key",
  PLATFORM_API_URL: "http://platform.internal:8080", ATLAS_API_URL: "http://atlas:3100", RUNOS_API_URL: "http://runos:3120",
  DATABASE_URL: "postgresql://bidproposal_svc:synthetic-password@db/business",
  REDIS_URL: "redis://redis:6379",
};
const successful: ReadinessProbes = { database: async () => true, redis: async () => true };

// ============================================================================
// Public readiness contracts
// ============================================================================

test("readiness needs real dependency success and complete product-owned configuration", async () => {
  assert.deepEqual(await readinessChecks(env, successful), { configuration: "ok", db: "ok", redis: "ok" });
  for (const key of Object.keys(env)) {
    assert.equal((await readinessChecks({ ...env, [key]: undefined }, successful)).configuration, "fail", key);
  }
  assert.deepEqual(await readinessChecks(env, { database: async () => false, redis: async () => false }),
    { configuration: "ok", db: "fail", redis: "fail" });
});

test("callback mismatches, privileged identities, mock overrides and unsafe upstreams fail readiness", async () => {
  for (const override of [
    { OIDC_REDIRECT_URI: "https://foreign.example/auth/callback" },
    { OIDC_POST_LOGOUT_REDIRECT_URI: "https://foreign.example/" },
    { OIDC_CLIENT_ID: "ruyin-desktop" }, { OIDC_RP_ENABLED: "off" },
    { OIDC_ISSUER: "http://accounts.example" }, { NEXT_PUBLIC_APP_URL: "https://bid.example/nested" },
    { PROVISION_WEBHOOK_SECRET: "short" }, { DATABASE_URL: "postgresql://postgres:password@db/business" },
    { PLATFORM_API_URL: "http://public.example" }, { ATLAS_API_URL: "https://user:password@atlas.example" },
    { RUNOS_API_URL: "https://runos.example/#fragment" }, { REDIS_URL: "https://redis.example" },
    { ALLOW_MOCK_ON_DEPLOY: "on" }, { PLATFORM_INTERNAL_AUTH_TOKEN: "retired-shared-credential" },
  ]) assert.equal((await readinessChecks({ ...env, ...override }, successful)).configuration, "fail", JSON.stringify(Object.keys(override)));
});

test("missing stores never connect to fallback localhost and adapter failures expose no diagnostics", async () => {
  let calls = 0;
  const failing: ReadinessProbes = {
    database: async () => { calls++; throw Error("postgresql://secret@private-address"); },
    redis: async () => { calls++; throw Error("redis credential and private endpoint"); },
  };
  assert.deepEqual(await readinessChecks({}, failing), { configuration: "fail", db: "fail", redis: "fail" });
  assert.equal(calls, 0);
  const result = await readinessChecks(env, failing);
  assert.equal(calls, 2);
  assert.doesNotMatch(JSON.stringify(result), /credential|secret|private|postgresql|redis:\/\//);
});

test("unconfigured service remains live but readiness fails without leaking runtime configuration", async () => {
  const keys = ["DATABASE_URL", "REDIS_URL", "OIDC_RP_ENABLED"] as const;
  const saved = keys.map((key) => [key, process.env[key]] as const);
  for (const key of keys) delete process.env[key];
  try {
    const [first, second] = await Promise.all([readyRoute(), readyRoute()]);
    for (const response of [first, second]) {
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = await response.json();
      assert.equal(body.status, "fail");
      assert.equal(body.product, "bidproposal");
      assert.equal(body.service, "bidproposal-app");
      assert.deepEqual(body.checks, { configuration: "fail", db: "fail", redis: "fail" });
      assert.deepEqual(Object.keys(body).sort(), ["service", "product", "version", "gitSha", "stage", "buildTime", "time", "status", "checks"].sort());
    }
    assert.equal(liveRoute().status, 200);
  } finally {
    for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
