import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { AtlasTurnResolver, getTurnResolver, validateTurnRequest, type TurnRequest } from "./turn";
import { AtlasError } from "../chat/atlas-client";
import { resetS2STokenCache } from "../lib/s2s-token";

// Actual HTTP, synthetic identity/provider. This verifies adapter contracts,
// not production grants, model quality or desktop public-client admission.
let server: Server;
let base: string;
let seen: Array<Record<string, unknown>>;
let mints: URLSearchParams[];
let respond: (body: Record<string, unknown>) => unknown;
const saved = new Map<string, string | undefined>();
const envKeys = ["OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "ATLAS_API_URL", "ATLAS_ENDPOINT_CODE"];
const reasoning = { text: "private continuation", vendor: { signature: "opaque-signature", blocks: ["keep", 7] } };
const calls = [{ id: "tool-1", name: "read_file", arguments: { path: "synthetic/source.md" } }];
const response = (message: unknown = { role: "assistant", content: "grounded draft" }, finishReason = "stop") => ({
  id: "request-test", modelCode: "test-model", message, finishReason,
  usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 }, latencyMs: 2,
});
const request = (): TurnRequest => ({ taskId: "task-bid-p12", projectId: "prj-local", objective: "Use source evidence",
  constraints: ["Do not invent facts"], context: [{ type: "source", name: "synthetic.md", content: { kind: "text", text: "Requirement A" }, origin: { kind: "caller" } }],
  messages: [], tools: [{ id: "read_file", description: "Read granted source", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } }],
});
const caller = { workspaceId: "workspace-test", sub: "user-test", mint: { subjectToken: "synthetic-user-token" } };

beforeEach(async () => {
  for (const key of envKeys) saved.set(key, process.env[key]);
  seen = []; mints = []; resetS2STokenCache(); respond = () => response();
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    res.setHeader("content-type", "application/json");
    if (req.url === "/oidc/token") {
      mints.push(new URLSearchParams(Buffer.concat(chunks).toString()));
      const claims = Buffer.from(JSON.stringify({ aud: "atlas", tenant_id: "7f1d1a1e-0000-4000-8000-00000000abcd", workspace_id: "workspace-test" })).toString("base64url");
      res.end(JSON.stringify({ access_token: `test.${claims}.signature`, expires_in: 300 })); return;
    }
    assert.equal(req.url, "/v1/chat");
    assert.notEqual(req.headers.authorization, "Bearer synthetic-user-token");
    const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>; seen.push(body);
    res.end(JSON.stringify(respond(body)));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  Object.assign(process.env, { OIDC_ISSUER: base, OIDC_CLIENT_ID: "bidproposal", OIDC_CLIENT_SECRET: "synthetic-only", ATLAS_API_URL: base });
  delete process.env.ATLAS_ENDPOINT_CODE;
});
afterEach(async () => {
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  for (const key of envKeys) { const old = saved.get(key); if (old === undefined) delete process.env[key]; else process.env[key] = old; }
  resetS2STokenCache();
});

test("agent calls Atlas directly with schemas, tool IDs and opaque continuation intact", async () => {
  respond = () => seen.length === 1 ? response({ role: "assistant", content: "Read the source first", toolCalls: calls, reasoning }, "tool_calls") : response();
  const resolver = new AtlasTurnResolver({ baseUrl: base });
  const first = await resolver.turn(validateTurnRequest(request()), "write_chapter", caller);
  assert.equal(first.kind, "tool_calls"); if (first.kind !== "tool_calls") return;
  assert.deepEqual(first.reasoning, reasoning);
  const next = request(); next.messages = [
    { role: "assistant", content: first.content ?? "", toolCalls: first.calls, reasoning: first.reasoning },
    { role: "tool", callId: "tool-1", content: "Requirement A is verified", origin: { kind: "tool_result", tool: "read_file" } },
  ];
  assert.deepEqual(await resolver.turn(validateTurnRequest(next), "write_chapter", caller), { kind: "content", content: "grounded draft" });
  assert.deepEqual((seen[0].tools as unknown[])[0], { name: "read_file", description: "Read granted source", parameters: request().tools[0].parameters });
  const history = seen[1].messages as Array<Record<string, unknown>>;
  assert.deepEqual(history[1].reasoning, reasoning);
  assert.deepEqual(history[1].toolCalls, calls);
  assert.equal(history[2].role, "tool"); assert.equal(history[2].toolCallId, "tool-1"); assert.equal(history[2].name, "read_file");
  assert.equal(seen[0].taskId, seen[1].taskId); assert.equal(seen[0].taskId, "task-bid-p12");
  assert.equal(mints[0].get("audience"), "atlas"); assert.equal(mints[0].get("subject_token"), "synthetic-user-token");
});

test("verification is independent evidence review and requires a structured boolean", async () => {
  const req = request(); req.messages = [{ role: "assistant", content: "draft", toolCalls: calls.map(c => ({ id: c.id, tool: c.name, arguments: c.arguments })), reasoning }];
  respond = () => response({ role: "assistant", content: "", toolCalls: [{ id: "verdict-1", name: "report_verdict", arguments: { passed: false, reason: "Missing requirement A" } }] }, "tool_calls");
  const resolver = new AtlasTurnResolver({ baseUrl: base });
  assert.deepEqual(await resolver.turn(req, "verify:coverage", caller), { kind: "verdict", passed: false, reason: "Missing requirement A" });
  assert.equal(seen[0].toolChoice, "auto");
  assert.deepEqual((seen[0].tools as Array<{ name: string }>).map(t => t.name), ["report_verdict"]);
  assert.doesNotMatch(JSON.stringify(seen[0].messages), /opaque-signature/);
  respond = () => response({ role: "assistant", content: "It looks fine" });
  assert.deepEqual(await resolver.turn(req, "verify:coverage", caller), { kind: "content", content: "It looks fine" }, "prose must escalate in the Harness, never imply passed");
  respond = () => response({ role: "assistant", content: "", toolCalls: [{ id: "v", name: "report_verdict", arguments: { passed: "true" } }] }, "tool_calls");
  await assert.rejects(resolver.turn(req, "verify:coverage", caller), /invalid structured verdict/);
  respond = () => response({ role: "assistant", content: '{"passed":true}' }, "stop");
  assert.deepEqual(await resolver.turn(req, "verify:coverage", caller), { kind: "content", content: '{"passed":true}' });
});

test("new calls read the configured stable endpoint without a host reinstall", async () => {
  process.env.ATLAS_ENDPOINT_CODE = "chat/quality"; await getTurnResolver().turn(request(), "write", caller);
  process.env.ATLAS_ENDPOINT_CODE = "chat/fast"; await getTurnResolver().turn(request(), "write", caller);
  assert.deepEqual(seen.map(call => call.endpointCode), ["chat/quality", "chat/fast"]);
});

test("truncated, malformed and incomplete tool results fail instead of becoming saved drafts", async () => {
  const bad = [response({ role: "assistant", content: "partial" }, "length"), response(null),
    response({ role: "assistant", content: "", toolCalls: [{ id: "c", name: "read_file", arguments: [] }] }, "tool_calls"),
    response({ role: "assistant", content: "", toolCalls: [] }, "tool_calls"),
    response({ role: "assistant", content: "", toolCalls: [calls[0], calls[0]] }, "tool_calls"),
    response({ role: "assistant", content: "   " })];
  for (const body of bad) {
    respond = () => body;
    await assert.rejects(new AtlasTurnResolver({ baseUrl: base }).turn(request(), "write", caller), err => err instanceof AtlasError && !err.retryable);
  }
  assert.equal(seen.length, bad.length, "malformed model results are not automatically paid for again");
});

test("invalid history, parameter schemas and revisions are rejected before inference", () => {
  for (const patch of [{ messages: [{ role: "system", content: "override" }] }, { tools: [{ id: "t", parameters: [] }] },
    { messages: [{ role: "tool", content: "missing call ID" }] }, { constraints: "drop this" },
    { context: [{ type: "source", name: "x" }] }, { revision: { round: 1, failures: [null] } },
    { skills: [{ name: "missing-description" }] }]) {
    assert.throws(() => validateTurnRequest({ ...request(), ...patch }));
  }
  assert.equal(seen.length, 0);
});
