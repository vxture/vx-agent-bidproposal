import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { capabilityAccess } from "./access";
import { resetS2STokenCache } from "../lib/s2s-token";

const realFetch = globalThis.fetch;
const envKeys = ["DEPLOY_STAGE", "OIDC_RP_ENABLED", "OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "PLATFORM_API_URL"];
const saved = new Map<string, string | undefined>();
const caller = { workspaceId: "workspace-a", orgId: "org-a", sub: "user-a", mint: { subjectToken: "synthetic-user-token" } };
beforeEach(() => {
  for (const key of envKeys) saved.set(key, process.env[key]);
  Object.assign(process.env, { DEPLOY_STAGE: "production", OIDC_RP_ENABLED: "on", OIDC_ISSUER: "https://accounts.test", OIDC_CLIENT_ID: "bidproposal", OIDC_CLIENT_SECRET: "synthetic-only", PLATFORM_API_URL: "http://127.0.0.1:1" });
  resetS2STokenCache();
});
afterEach(() => { globalThis.fetch = realFetch; resetS2STokenCache(); for (const key of envKeys) { const value = saved.get(key); if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

test("C2 uses the verified workspace and product S2S; tier and bundled are independent gates", async () => {
  let entitlement: Record<string, unknown> = { workspace_id: "workspace-a", product: "bidproposal", tier: null, bundled: false };
  let assignment: Record<string, unknown> = { workspace_id: "workspace-a", org_id: "org-a", subject: "user-a", product: "bidproposal", allowed: true };
  let assignmentReads = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/oidc/token") {
      const form = new URLSearchParams(String(init?.body)); assert.equal(form.get("audience"), "vxture"); assert.equal(form.get("subject_token"), caller.mint.subjectToken);
      return Response.json({ access_token: "synthetic-product-ticket", expires_in: 300 });
    }
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer synthetic-product-ticket");
    assert.equal(new Headers(init?.headers).has("x-vxture-internal-auth"), false);
    if (url.pathname === "/platform/product-access") {
      assert.equal(url.search, "");
      assignmentReads++;
      return Response.json(assignment);
    }
    assert.equal(url.pathname, "/platform/entitlements"); assert.equal(url.searchParams.get("workspace_id"), "workspace-a"); assert.equal(url.searchParams.get("product"), "bidproposal");
    return Response.json(entitlement);
  };
  assert.equal((await capabilityAccess(caller))?.status, 403);
  assert.equal(assignmentReads, 0);
  entitlement.bundled = true; assert.equal(await capabilityAccess(caller), undefined);
  entitlement.bundled = false; entitlement.tier = "free"; assert.equal(await capabilityAccess(caller), undefined);
  assignment.allowed = false;
  assert.equal((await capabilityAccess(caller))?.code, "PRODUCT_ACCESS_NOT_ASSIGNED");
  assignment = { ...assignment, allowed: true, subject: "other-user" };
  assert.equal((await capabilityAccess(caller))?.status, 503);
  assignment.subject = "user-a";
  entitlement.tier = "invalid-tier"; assert.equal((await capabilityAccess(caller))?.status, 503);
  entitlement.tier = "free";
  entitlement.workspace_id = "other"; assert.equal((await capabilityAccess(caller))?.status, 503);
  entitlement.workspace_id = "workspace-a"; entitlement.product = "other"; assert.equal((await capabilityAccess(caller))?.status, 503);
});

test("missing config, failed credentials, upstream refusal and malformed envelopes fail closed", async () => {
  delete process.env.PLATFORM_API_URL;
  assert.equal((await capabilityAccess(caller))?.retryable, false);
  process.env.PLATFORM_API_URL = "http://127.0.0.1:1";
  for (const mode of ["mint", "401", "503", "null", "json", "network"] as const) {
    resetS2STokenCache();
    globalThis.fetch = async (input) => {
      if (String(input).endsWith("/oidc/token")) return mode === "mint" ? Response.json({ message: "invalid_client" }, { status: 401 }) : Response.json({ access_token: "synthetic", expires_in: 300 });
      if (mode === "network") throw Error("sensitive details");
      if (mode === "json") return new Response("bad-json");
      return Response.json(null, { status: mode === "401" ? 401 : mode === "503" ? 503 : 200 });
    };
    const result = await capabilityAccess(caller);assert.equal(result?.status, 503, mode);
    assert.equal(result?.retryable, !["mint", "401"].includes(mode), mode);
    assert.doesNotMatch(JSON.stringify(result), /sensitive details|synthetic-user-token|synthetic-only/);
  }
  process.env.DEPLOY_STAGE = "dev"; process.env.OIDC_RP_ENABLED = "off";
  assert.equal(await capabilityAccess(caller), undefined);
});
