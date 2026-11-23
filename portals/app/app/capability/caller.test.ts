import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { getOidcConfig } from "../auth/lib/config";
import { verifyToken } from "../auth/lib/oidc";
import { toAuthUser } from "../auth/lib/claims";
import { DEV_WORKSPACE_ID, isRefusal, resolveCapabilityCaller } from "./caller";

const names = ["DEPLOY_STAGE", "OIDC_RP_ENABLED", "OIDC_CLIENT_ID", "OIDC_ISSUER", "NEXT_PUBLIC_APP_URL", "RP_SESSION_COOKIE_NAME", "RUYIN_CLIENT_ID"];
const saved = new Map<string, string | undefined>();
const issuer = "https://synthetic-accounts.test";
const origin = "https://bidproposal.test";
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const claims = { sub: "synthetic-user-a", active_workspace: "workspace-a", account_status: "active" };
const mint = (extra: Record<string, unknown> = {}) => new SignJWT({ ...claims, ...extra }).setProtectedHeader({ alg: "RS256" })
  .setIssuer(issuer).setAudience("bidproposal").setIssuedAt().setExpirationTime("5m").sign(keys.privateKey);
const verify = (token: string, audience: string) => verifyToken(token, getOidcConfig(), { audience, keyResolver: keys.publicKey });
const status = (result: Awaited<ReturnType<typeof resolveCapabilityCaller>>) => isRefusal(result) ? result.status : 200;

beforeEach(() => {
  for (const name of names) saved.set(name, process.env[name]);
  Object.assign(process.env, { DEPLOY_STAGE: "production", OIDC_RP_ENABLED: "on", OIDC_CLIENT_ID: "bidproposal",
    OIDC_ISSUER: issuer, NEXT_PUBLIC_APP_URL: origin, RP_SESSION_COOKIE_NAME: "product-session" });
});
afterEach(() => { for (const name of names) { const value = saved.get(name); if (value === undefined) delete process.env[name]; else process.env[name] = value; } });

test("own product RS256 bearer supplies the only OBO subject and workspace", async () => {
  const token = await mint();
  const result = await resolveCapabilityCaller(new Headers({ authorization: `Bearer ${token}` }), { verify });
  assert.deepEqual(result, { workspaceId: "workspace-a", sub: "synthetic-user-a", mint: { subjectToken: token } });
});

test("foreign, multiple-audience, expired and forged tokens are rejected before OBO", async () => {
  process.env.RUYIN_CLIENT_ID = "ruyin";
  for (const token of [await new SignJWT(claims).setProtectedHeader({ alg: "RS256" }).setIssuer(issuer).setAudience("ruyin").setExpirationTime("5m").sign(keys.privateKey),
      await new SignJWT(claims).setProtectedHeader({ alg: "RS256" }).setIssuer(issuer).setAudience(["bidproposal", "ruyin"]).setExpirationTime("5m").sign(keys.privateKey),
      await new SignJWT(claims).setProtectedHeader({ alg: "RS256" }).setIssuer(issuer).setAudience("bidproposal").setExpirationTime(1).sign(keys.privateKey), "forged"]) {
    assert.equal(status(await resolveCapabilityCaller(new Headers({ authorization: `Bearer ${token}` }), { verify })), 401);
  }
});

test("beta uses the actual client ID and does not confuse it with product code", async () => {
  process.env.OIDC_CLIENT_ID = "bidproposal-beta";
  const token = await new SignJWT(claims).setProtectedHeader({ alg: "RS256" }).setIssuer(issuer).setAudience("bidproposal-beta").setExpirationTime("5m").sign(keys.privateKey);
  assert.equal(status(await resolveCapabilityCaller(new Headers({ authorization: `Bearer ${token}` }), { verify })), 200);
  assert.equal(status(await resolveCapabilityCaller(new Headers({ authorization: `Bearer ${await mint()}` }), { verify })), 401);
});

test("product cookie resolves server-side and is never sent as the downstream token", async () => {
  const token = await mint();
  let resolved = 0;
  const result = await resolveCapabilityCaller(new Headers({ cookie: "unrelated=x; product-session=opaque-rp-session", origin }), {
    method: "POST", verify, session: async (cfg, handle) => {
      resolved++; assert.equal(cfg.clientId, "bidproposal"); assert.equal(handle, "opaque-rp-session");
      return { accessToken: token, idToken: "never returned", user: toAuthUser({ sub: "not-authority", active_workspace: "not-authority" }) };
    },
  });
  assert.equal(resolved, 1);
  assert.deepEqual(result, { sub: claims.sub, workspaceId: claims.active_workspace, mint: { subjectToken: token } });
  assert.doesNotMatch(JSON.stringify(result), /opaque-rp-session|never returned|not-authority/);
});

test("cookie writes require same origin; cross-site reads and foreign origins are refused", async () => {
  let calls = 0;
  const cases: Record<string, string>[] = [{ cookie: "product-session=rp" }, { cookie: "product-session=rp", origin: "https://other.test" },
      { cookie: "product-session=rp", origin: "null" }, { cookie: "product-session=rp", origin, "sec-fetch-site": "cross-site" }];
  for (const headers of cases) {
    const result = await resolveCapabilityCaller(new Headers(headers), { method: "POST", verify, session: async () => { calls++; return null; } });
    assert.equal(status(result), 403);
  }
  assert.equal(status(await resolveCapabilityCaller(new Headers({ cookie: "product-session=rp", "sec-fetch-site": "cross-site" }), { verify })), 403);
  assert.equal(calls, 0);
});

test("missing, duplicate and invalid cookies do not resolve a session; outages do not become logout", async () => {
  let calls = 0;
  for (const cookie of ["", "other=rp", "product-session=", "product-session=%XX", "product-session=a; product-session=b", "product-session=a%20b"]) {
    const result = await resolveCapabilityCaller(new Headers({ cookie }), { verify, session: async () => { calls++; return null; } });
    assert.equal(status(result), 401);
  }
  assert.equal(calls, 0);
  const headers = new Headers({ cookie: "product-session=rp" });
  assert.equal(status(await resolveCapabilityCaller(headers, { session: async () => null })), 401);
  const unavailable = await resolveCapabilityCaller(headers, { session: async () => { throw new Error("sensitive store details"); } });
  assert.equal(status(unavailable), 503);
  assert.ok(isRefusal(unavailable) && unavailable.retryable);
  assert.doesNotMatch(JSON.stringify(unavailable), /sensitive store details/);
});

test("explicit invalid bearer never falls back to a valid cookie", async () => {
  let calls = 0;
  for (const authorization of ["", "Basic abc", "Bearer", "Bearer a,b", "Bearer a b", "Bearer forged"]) {
    const result = await resolveCapabilityCaller(new Headers({ authorization, cookie: "product-session=rp" }), {
      verify, session: async () => { calls++; throw Error("must not read"); },
    });
    assert.equal(status(result), 401);
  }
  assert.equal(calls, 0);
});

test("inactive accounts and missing verified identity are refused for both transport forms", async () => {
  for (const extra of [{ account_status: "suspended" }, { account_status: "closing" }, { active_workspace: "" }, { active_workspace: null }, { sub: "" }]) {
    const token = await mint(extra);
    const bearer = await resolveCapabilityCaller(new Headers({ authorization: `Bearer ${token}` }), { verify });
    assert.ok(isRefusal(bearer));
    const cookie = await resolveCapabilityCaller(new Headers({ cookie: "product-session=rp" }), {
      verify, session: async () => ({ accessToken: token, idToken: "", user: toAuthUser(claims) }),
    });
    assert.equal(status(cookie), status(bearer));
  }
});

test("unconfigured auth refuses deployed stages; the existing local fixture remains local", async () => {
  process.env.OIDC_RP_ENABLED = "off";
  assert.equal(status(await resolveCapabilityCaller(new Headers())), 503);
  process.env.DEPLOY_STAGE = "dev";
  assert.deepEqual(await resolveCapabilityCaller(new Headers()), { workspaceId: DEV_WORKSPACE_ID, mint: { workspaceId: DEV_WORKSPACE_ID } });
});
