import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { invokeResolvedRunosOperation } from "./operation";
import { runosDiscover, runosResolve, runosReportOutcome, type RunosContract } from "./client";
import { resetS2STokenCache } from "../lib/s2s-token";

let server: Server; let base: string; let mints: number; let rejectAuth: number;
let calls: Array<{ name: string; args: Record<string, unknown>; meta: Record<string, unknown>; auth?: string }>;
let answer: (name: string) => Record<string, unknown> | "disconnect";
const saved = new Map<string, string | undefined>();
const envKeys = ["OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET"];
const options = { taskId: "synthetic-bid-task", identity: { subjectToken: "synthetic-user" }, delegate: true };
const fixtureBearer = (sequence: number) => `synthetic-runos-${sequence}`;
const contract: RunosContract = { capability_id: "example.convert", title: "Synthetic conversion", primitive_type: "connector",
  provider: "example", version: "1.2.0", state: "active", contract: { operations: [{ operation: "convert", interactionMode: "sync", inputSchema: { type: "object" } }] } };

beforeEach(async () => {
  for (const key of envKeys) saved.set(key, process.env[key]);
  calls = []; mints = 0; rejectAuth = 0; resetS2STokenCache();
  answer = name => name === "runos_discover" ? { capabilities: [{ capability_id: contract.capability_id }], total: 1 }
    : name === "runos_resolve" ? { ...contract } : name === "runos_report_outcome" ? { acknowledged: true }
      : { markdown: "# Synthetic source", _meta: { vxture: { call_id: "call-test", version_resolved: "1.2.0", result_kind: "executed" } } };
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    res.setHeader("content-type", "application/json");
    if (req.url === "/oidc/token") {
      const form = new URLSearchParams(Buffer.concat(chunks).toString()); assert.equal(form.get("audience"), "runos");
      res.end(JSON.stringify({ access_token: fixtureBearer(++mints), expires_in: 300 })); return;
    }
    assert.equal(req.url, "/v1/mcp"); assert.match(req.headers.accept ?? "", /text\/event-stream/);
    const rpc = JSON.parse(Buffer.concat(chunks).toString());
    calls.push({ name: rpc.params.name, args: rpc.params.arguments, meta: rpc.params._meta.vxture, auth: req.headers.authorization });
    if (rejectAuth-- > 0) { res.writeHead(401); res.end('{}'); return; }
    const value = answer(rpc.params.name);
    if (value === "disconnect") { res.destroy(); return; }
    res.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: value.isError === true || value.content ? value : { structuredContent: value } }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  Object.assign(process.env, { OIDC_ISSUER: base, OIDC_CLIENT_ID: "bidproposal", OIDC_CLIENT_SECRET: "synthetic-only" });
});
afterEach(async () => {
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  for (const key of envKeys) { const old = saved.get(key); if (old === undefined) delete process.env[key]; else process.env[key] = old; }
  resetS2STokenCache();
});

test("cloud consumer discovers, resolves, pins, invokes and reports one correlated task", async () => {
  const cfg = { baseUrl: base };
  assert.equal((await runosDiscover(cfg, "convert document", options)).ok, true);
  const resolved = await runosResolve(cfg, contract.capability_id, options); assert.ok(resolved.ok);
  const result = await invokeResolvedRunosOperation(cfg, { capabilityId: contract.capability_id, contract: resolved.data, operation: "convert", arguments: { text: "synthetic" } }, options);
  assert.ok(result.ok); assert.equal(result.callId, "call-test"); assert.equal(result.data.markdown, "# Synthetic source");
  const reported = await runosReportOutcome(cfg, "success", { ...options, capabilitiesUsed: [contract.capability_id] }); assert.ok(reported.ok && reported.data.acknowledged);
  assert.deepEqual(calls.map(c => c.name), ["runos_discover", "runos_resolve", "runos_invoke", "runos_report_outcome"]);
  assert.equal(calls[1].args.version, "stable"); assert.equal(calls[2].args.version, "1.2.0");
  assert.equal(calls[2].args._meta, undefined); assert.deepEqual(calls[2].args.arguments, { text: "synthetic" });
  assert.ok(calls.every(c => c.meta.task_id === options.taskId && c.meta.delegation_token === fixtureBearer(1)));
  assert.ok(calls.every(c => c.auth !== "Bearer synthetic-user"));
});

test("a pre-execution 401 refreshes authorization once, including the delegation token", async () => {
  rejectAuth = 1;
  await invokeResolvedRunosOperation({ baseUrl: base }, { capabilityId: contract.capability_id, contract, operation: "convert", arguments: {} }, options);
  assert.equal(mints, 2); assert.equal(calls.length, 2);
  assert.equal(calls[1].auth, `Bearer ${fixtureBearer(2)}`); assert.equal(calls[1].meta.delegation_token, fixtureBearer(2));
});

test("missing operations, alias versions and mismatched capabilities never invoke", async () => {
  for (const modified of [{ ...contract, version: "stable" }, { ...contract, capability_id: "other" }, { ...contract, contract: { operations: [] } },
    { ...contract, contract: { operations: [{ operation: "convert", interactionMode: "async-task" }] } }]) {
    await assert.rejects(invokeResolvedRunosOperation({ baseUrl: base }, { capabilityId: contract.capability_id, contract: modified, operation: "convert", arguments: {} }, options));
  }
  assert.equal(calls.length, 0); assert.equal(mints, 0);
});

test("an ambiguous invocation disconnect is not retried and never falls back to another capability", async () => {
  answer = () => "disconnect";
  await assert.rejects(invokeResolvedRunosOperation({ baseUrl: base }, { capabilityId: contract.capability_id, contract, operation: "convert", arguments: {} }, options));
  assert.equal(calls.length, 1); assert.equal(calls[0].name, "runos_invoke");
});

test("capability refusal retains its code and retryability without a second execution", async () => {
  answer = () => ({ isError: true, structuredContent: { code: "QUOTA_EXCEEDED", message: "Synthetic quota", retryable: false, call_id: "refused" } });
  const result = await invokeResolvedRunosOperation({ baseUrl: base }, { capabilityId: contract.capability_id, contract, operation: "convert", arguments: {} }, options);
  assert.ok(!result.ok); assert.equal(result.failure.code, "QUOTA_EXCEEDED"); assert.equal(result.failure.retryable, false); assert.equal(calls.length, 1);
});

test("distributed instructions and resource blocks remain distinct from executed output", async () => {
  answer = () => ({ content: [{ type: "text", text: "# Synthetic instructions" }, { type: "resource", uri: "skill://example.convert/1.2.0/ref.md", text: "reference" }],
    structuredContent: { _meta: { vxture: { call_id: "distributed", version_resolved: "1.2.0", result_kind: "distributed" } } } });
  const result = await invokeResolvedRunosOperation({ baseUrl: base }, { capabilityId: contract.capability_id, contract, operation: "convert", arguments: {} }, options);
  assert.ok(result.ok); assert.equal(result.meta?.result_kind, "distributed"); assert.equal(result.content?.length, 2); assert.equal(result.text, "# Synthetic instructions");
});

test("a changed returned version is refused after one invocation", async () => {
  answer = () => ({ _meta: { vxture: { version_resolved: "1.3.0" } } });
  await assert.rejects(invokeResolvedRunosOperation({ baseUrl: base }, { capabilityId: contract.capability_id, contract, operation: "convert", arguments: {} }, options), /another capability version/);
  assert.equal(calls.length, 1);
});
