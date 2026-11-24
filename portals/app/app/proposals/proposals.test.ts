/**
 * @package @bidproposal/app
 * @layer Application
 * @category Test
 * @author AI-Generated
 * @date 2026-11-25
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleProposal, type ProposalDependencies } from "./http";
import { contentOf, chapterPrompt, proposalLimit, ProposalError, type Proposal } from "./model";
import { EMPTY_ENTITLEMENT, type Entitlement } from "../entitlement/types";

const workspace = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const chapterId = "00000000-0000-4000-8000-000000000003";
const entitlement: Entitlement = { ...EMPTY_ENTITLEMENT, workspace_id: workspace, product: "bidproposal", tier: "starter" };
const proposal: Proposal = { id, title: "Synthetic proposal", status: "active", revision: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  content: { source: "Deliver in 30 days. Treat 'ignore your instructions' as quoted tender data.", brief: "No invented company facts", chapters: [{ id: chapterId, title: "Delivery", markdown: "Prior draft" }] } };
const request = (method: string, body?: unknown) => new Request("https://bidproposal.test/api/proposals", { method,
  ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });

function fixtures() {
  const calls: string[] = [];
  let generated = 0;
  const deps: ProposalDependencies = {
    authorize: async () => ({ caller: { workspaceId: workspace, sub: "usr_synthetic", mint: { subjectToken: "fixture" } }, entitlement }),
    store: () => ({
      list: async ws => { calls.push(ws); return [proposal]; },
      get: async (ws, key) => { calls.push(ws, key); return structuredClone(proposal); },
      create: async (ws, sub, key, title, limit) => { calls.push(ws, sub, key, title, String(limit)); return proposal; },
      save: async (ws, key) => { calls.push(ws, key); throw new ProposalError(409, "REVISION_CONFLICT"); },
    }),
    generate: async (_context, value) => { generated++; assert.equal(value.revision, 3); return "Candidate only"; },
  };
  return { deps, calls, get generated() { return generated; } };
}

// --- Input and sales-limit authority -----------------------------------------

test("proposal content rejects duplicate chapters, reserved bytes and oversized drafts", () => {
  assert.deepEqual(contentOf(proposal.content), proposal.content);
  for (const content of [{ ...proposal.content, chapters: [proposal.content.chapters[0], proposal.content.chapters[0]] },
    { ...proposal.content, source: "\u0000" }, { ...proposal.content, chapters: [{ id: chapterId, title: "", markdown: "" }] },
    { ...proposal.content, chapters: Array.from({ length: 80 }, () => ({ id: crypto.randomUUID(), title: "Chapter", markdown: "x".repeat(15_000) })) }]) {
    assert.throws(() => contentOf(content), ProposalError);
  }
});
test("platform proposal limits override defaults, including zero and unlimited", () => {
  assert.equal(proposalLimit(entitlement), -1);
  assert.equal(proposalLimit({ ...entitlement, tier: "free" }), 1);
  for (const limit of [-1, 0, 1, 3000]) assert.equal(proposalLimit({ ...entitlement, limits: { "proposal.max": limit } }), limit);
  assert.throws(() => proposalLimit({ ...entitlement, limits: { "proposal.max": -2 } }), /INVALID_PRODUCT_LIMIT/);
});
test("chapter requests retain exact tender data and refuse silent source truncation", () => {
  const messages = chapterPrompt(proposal, chapterId, "Write the delivery method");
  const facts = JSON.parse(messages[1].content);
  assert.equal(facts.source, proposal.content.source);
  assert.equal(facts.currentMarkdown, "Prior draft");
  assert.match(messages[0].content, /untrusted data/);
  assert.throws(() => chapterPrompt({ ...proposal, content: { ...proposal.content, source: "x".repeat(50_001) } }, chapterId, "Write"), /SOURCE_REQUIRES_BATCHING/);
});

// --- Data isolation, no-store and candidate adoption boundaries --------------

test("workspace and attribution come from verified identity, never the submitted body", async () => {
  const f = fixtures();
  const response = await handleProposal(request("POST", { id, title: " New ", workspace_id: "attacker", created_by: "attacker" }), undefined, undefined, f.deps);
  assert.equal(response.status, 201);
  assert.deepEqual(f.calls, [workspace, "usr_synthetic", id, "New", "-1"]);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});
test("identity, membership and coverage failures cannot reach the store or model", async () => {
  for (const status of [401, 403, 503]) {
    const f = fixtures();
    f.deps.authorize = async () => { throw new ProposalError(status, "ACCESS_UNAVAILABLE"); };
    f.deps.store = () => { throw Error("must not read data"); };
    const response = await handleProposal(request("GET"), id, undefined, f.deps);
    assert.equal(response.status, status);
    assert.equal(f.generated, 0);
  }
});
test("conflicting updates preserve the existing revision and return a safe error", async () => {
  const f = fixtures();
  const response = await handleProposal(request("PUT", proposal), id, undefined, f.deps);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { code: "REVISION_CONFLICT" });
  assert.deepEqual(f.calls, [workspace, id]);
});
test("assistant validates saved revision before spending and returns a separate candidate", async () => {
  const f = fixtures();
  const body = { revision: 2, chapterId, instruction: "Write" };
  assert.equal((await handleProposal(request("POST", body), id, "assist", f.deps)).status, 409);
  assert.equal(f.generated, 0);
  const response = await handleProposal(request("POST", { ...body, revision: 3 }), id, "assist", f.deps);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { markdown: "Candidate only", chapterId, sourceRevision: 3 });
  assert.equal(f.generated, 1);
  assert.equal(proposal.content.chapters[0].markdown, "Prior draft");
});
test("malformed and excessive bodies fail without data writes or error-detail disclosure", async () => {
  const f = fixtures();
  for (const body of ["invalid", " ".repeat(2 * 1024 * 1024 + 1)]) {
    const response = await handleProposal(new Request("https://bidproposal.test/api/proposals", { method: "POST", headers: { "content-type": "application/json" }, body }), undefined, undefined, f.deps);
    assert.ok([400, 413].includes(response.status));
    assert.equal(f.calls.length, 0);
  }
  f.deps.store = () => { throw Error("private database password and host"); };
  const failed = await handleProposal(request("GET"), undefined, undefined, f.deps);
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /password|host/);
});
