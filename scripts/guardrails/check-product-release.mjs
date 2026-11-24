/** Smoke the production-shaped Web artifact without source, credentials, or live services. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../../portals/app/", import.meta.url));
const artifact = mkdtempSync(join(tmpdir(), "bidproposal-release-"));
let child;
const webhookFixture = ["isolated", "signing", "fixture"].join("-");
try {
  cpSync(join(app, ".next", "standalone"), artifact, { recursive: true });
  const runDir = join(artifact, "portals", "app");
  cpSync(join(app, ".next", "static"), join(runDir, ".next", "static"), { recursive: true });
  cpSync(join(app, "public"), join(runDir, "public"), { recursive: true });

  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((fulfill, reject) => socket.close((error) => error ? reject(error) : fulfill()));
  const env = Object.fromEntries(["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "HOME", "USERPROFILE"]
    .filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
  child = spawn(process.execPath, [join(runDir, "server.js")], {
    cwd: artifact,
    env: { ...env, HOSTNAME: "127.0.0.1", PORT: String(port), NODE_ENV: "production",
      DEPLOY_STAGE: "production", OIDC_RP_ENABLED: "off", NEXT_TELEMETRY_DISABLED: "1",
      PROVISION_WEBHOOK_SECRET: webhookFixture },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (data) => { log += String(data); });
  child.stderr.on("data", (data) => { log += String(data); });
  const base = "http://127.0.0.1:" + port;
  const request = (path, options) => fetch(base + path, {
    redirect: "manual", signal: AbortSignal.timeout(5000), ...options,
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) break;
    if (await request("/api/health").then((r) => r.ok, () => false)) {
      ready = true;
      break;
    }
    await delay(100);
  }
  assert.ok(ready, "Standalone service failed to start: " + log);
  const health = await (await request("/api/health")).json();
  assert.equal(health.product, "bidproposal");
  assert.equal(health.service, "bidproposal-app");
  const readiness = await request("/api/ready");
  assert.equal(readiness.status, 503);
  assert.equal(readiness.headers.get("cache-control"), "no-store");
  const readinessBody = await readiness.json();
  assert.equal(readinessBody.status, "fail");
  assert.equal(readinessBody.product, "bidproposal");
  assert.deepEqual(readinessBody.checks, { configuration: "fail", db: "fail", redis: "fail" });
  const home = await request("/");
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Bidproposal/);
  assert.doesNotMatch(html, /20-SECOND CHALLENGE|entitlement-matrix|\/api\/game/);
  for (const path of ["/challenge", "/chat", "/platform-check", "/entitlement-matrix",
    "/api/game", "/api/chat", "/api/platform-check"]) {
    assert.equal((await request(path)).status, 404, path);
  }
  assert.equal((await request("/api/game/run", { method: "POST" })).status, 404);
  assert.equal((await request("/api/usage/flush", { method: "POST" })).status, 404);
  const contractUrl = "/api/products/bidproposal/contract";
  const contract = await request(contractUrl);
  assert.equal(contract.status, 200);
  assert.match(await contract.text(), /\n  id: bidproposal\n/);
  const etag = contract.headers.get("etag");
  assert.ok(etag);
  assert.equal((await request(contractUrl, { headers: { "if-none-match": etag } })).status, 304);
  assert.equal((await request("/api/products/tenderforge/contract")).status, 404);
  const access = await request("/api/access");
  assert.deepEqual(await access.json(), { status: "unconfigured" });
  assert.match(access.headers.get("cache-control") ?? "", /no-store/);
  assert.equal((await request("/api/entitlement")).status, 503);
  const webhook = "/api/webhooks/vxture";
  assert.equal((await request(webhook, { method: "POST", body: "{}" })).status, 401);
  assert.equal((await request("/provisioning/webhook", { method: "POST", body: "{}" })).status, 404);
  const t = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    id: "fixture-delivery", type: "tenant.provisioned", occurred_at: t,
    seq: 1, workspace_id: "00000000-0000-4000-8000-000000000001",
    tenant_id: "00000000-0000-4000-8000-000000000002",
    application: "bidproposal", plan: null, data: {},
  }, null, 2);
  const digest = createHmac("sha256", webhookFixture).update(`${t}.${body}`).digest("hex");
  const headers = { "x-vxture-signature": `t=${t},v1=${digest}`, "x-vxture-delivery": "fixture-delivery" };
  assert.equal((await request(webhook, { method: "POST", headers, body })).status, 503);
  assert.equal((await request(webhook, { method: "POST", headers, body: body + " " })).status, 401);
  assert.equal((await request(webhook, { method: "POST", headers: { ...headers, "x-vxture-delivery": "other" }, body })).status, 400);
  assert.equal((await request(webhook, { method: "POST", body: " ".repeat(64 * 1024 + 1) })).status, 413);
  console.log("Bidproposal standalone release smoke passed");
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
  assert.ok(resolve(artifact).startsWith(resolve(tmpdir(), "bidproposal-release-")));
  rmSync(artifact, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
}
