import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { defaultSkillsRelayDeps, fetchDistributedSkill, listDistributedSkills, skillNameOf, truncationOf, type SkillsRelayDeps } from "./skills";
import { DEV_WORKSPACE_ID, type CapabilityCaller } from "./caller";
import type { RunosCapability, RunosContract, RunosResult } from "../runos/client";

// The skill relay hands Runos-distributed Skills to the Ruyin runtime
// (vxture-ruyin ADR-020 section 3c). Runos is injected: these tests pin what bidproposal
// does with what Runos says, never whether Runos is reachable.

const caller: CapabilityCaller = { workspaceId: DEV_WORKSPACE_ID, mint: { workspaceId: DEV_WORKSPACE_ID } };
const cfg = { baseUrl: "https://runos.test" } as SkillsRelayDeps["cfg"];

const skill = (id: string, summary: string): RunosCapability => ({
  capability_id: id,
  title: id,
  primitive_type: "skill",
  summary,
  operations: [{ operation: "fetch", risk_level: "read" }],
});
const ok = <T>(data: T, meta?: Record<string, unknown>): RunosResult<T> =>
  ({ ok: true, data, ...(meta ? { meta } : {}) }) as RunosResult<T>;
const fail = (code: string): RunosResult<never> =>
  ({ ok: false, failure: { code, message: code, retryable: false } }) as RunosResult<never>;

function deps(over: Partial<SkillsRelayDeps> = {}): SkillsRelayDeps {
  return {
    cfg,
    discover: async () =>
      ok({
        capabilities: [
          skill("sensenova.sn-deep-research", "深度研究"),
          skill("officecli.officecli-docx", "Word 文档"),
          { ...skill("arda.invoice-query", "发票查询"), primitive_type: "connector" },
        ],
      }),
    resolve: async (_cfg, capabilityId) => ok({ capability_id: capabilityId, version: "1.2.0" } as RunosContract),
    invoke: async () =>
      ok(
        {
          content: [
            { type: "text", text: "---\nname: officecli-docx\n---\n# DOCX" },
            { type: "resource", uri: "skill://officecli.officecli-docx/1.2.0/references/REFERENCE.md", mimeType: "text/markdown", text: "ref" },
          ],
        },
        { version_resolved: "1.2.0", content_digest: "sha256:abc", result_kind: "distributed" },
      ),
    ...over,
  };
}

test("skillNameOf: the kebab-case tail of the capability id is the Agent Skills name", () => {
  assert.equal(skillNameOf("officecli.officecli-docx"), "officecli-docx");
  assert.equal(skillNameOf("SenseNova.SN-Deep-Research"), "sn-deep-research");
});

test("list: unconfigured says so honestly - never an empty catalogue pretending to be the answer", async () => {
  const r = await listDistributedSkills(caller, "t1", deps({ cfg: null }));
  assert.equal(r.status.configured, false);
  assert.match(r.status.reason ?? "", /RUNOS_API_URL/);
  assert.deepEqual(r.skills, []);
});

test("list: asks Runos for Skills only, drops anything else, sorts by name", async () => {
  let askedFilter: unknown;
  const r = await listDistributedSkills(
    caller,
    "t1",
    deps({
      discover: async (_cfg, _q, opts) => {
        askedFilter = (opts as { primitiveType?: string }).primitiveType;
        return deps().discover(_cfg, _q, opts);
      },
    }),
  );
  assert.equal(askedFilter, "skill");
  assert.equal(r.status.configured, true);
  assert.deepEqual(
    r.skills.map((s) => s.name),
    ["officecli-docx", "sn-deep-research"],
  );
  assert.equal(r.skills[0]?.capabilityId, "officecli.officecli-docx");
});

test("list: a Runos failure is reported as a reason, not thrown into the route", async () => {
  const r = await listDistributedSkills(caller, "t1", deps({ discover: async () => fail("CALLER_UNSUPPORTED_OPERATION") }));
  assert.equal(r.status.configured, false);
  assert.equal(r.status.complete, false);
  assert.match(r.status.reason ?? "", /runos_discover failed: CALLER_UNSUPPORTED_OPERATION/);
});

test("fetch: text + resources + Runos's digest + resolved version come back; unknown name is notFound", async () => {
  const r = await fetchDistributedSkill(caller, "t1", "officecli-docx", deps());
  assert.ok("content" in r);
  if ("content" in r) {
    assert.match(r.content, /name: officecli-docx/);
    assert.equal(r.resources.length, 1);
    assert.equal(r.resources[0]?.uri, "skill://officecli.officecli-docx/1.2.0/references/REFERENCE.md");
    assert.equal(r.contentDigest, "sha256:abc");
    assert.equal(r.digestSource, "runos");
    assert.equal(r.version, "1.2.0");
  }
  const missing = await fetchDistributedSkill(caller, "t1", "no-such-skill", deps());
  assert.ok(!("content" in missing) && missing.notFound === true);
});

test("fetch: when Runos sends no digest, bidproposal computes one and says it did", async () => {
  const r = await fetchDistributedSkill(
    caller,
    "t1",
    "sn-deep-research",
    deps({ invoke: async () => ok({ content: [{ type: "text", text: "# research" }] }) }),
  );
  assert.ok("content" in r);
  if ("content" in r) {
    assert.match(r.contentDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(r.digestSource, "computed");
    assert.equal(r.deliveryIntegrity, "unverified");
  }
});

test("fetch verifies the complete MCP skill package with namespaced delivery metadata", async () => {
  const content = "# Synthetic\r\n";
  const resources = [{ mimeType: "text/markdown", path: "references/empty.md", text: "" },
    { mimeType: "text/plain", path: "references/source.txt", text: "Evidence A\n" }];
  const digest = createHash("sha256").update(JSON.stringify({ content, resources })).digest("hex");
  const blocks = [{ type: "text", text: content }, ...resources.map(r => ({ type: "resource", uri: `skill://officecli.officecli-docx/1.2.0/${r.path}`, mimeType: r.mimeType, text: r.text }))];
  const invoke: SkillsRelayDeps["invoke"] = async () => ({ ok: true, data: {}, content: blocks,
    meta: { result_kind: "distributed", version_resolved: "1.2.0", content_digest: "registered-contract-digest", delivery_digest: digest, delivery_digest_format: "skill-package-v1" } });
  const result = await fetchDistributedSkill(caller, "t1", "officecli-docx", deps({ invoke }));
  assert.ok("content" in result); if (!("content" in result)) return;
  assert.equal(result.content, content); assert.equal(result.resources[0].text, "");
  assert.equal(result.contentDigest, "registered-contract-digest");
  assert.equal(result.deliveryDigest, digest); assert.equal(result.deliveryIntegrity, "verified");
});

test("a tampered resource, cross-package URI, wrong format or missing digest refuses the skill", async () => {
  const digest = createHash("sha256").update(JSON.stringify({ content: "# Skill", resources: [{ mimeType: "text/plain", path: "ref.txt", text: "original" }] })).digest("hex");
  for (const patch of [ { text: "tampered" }, { uri: "skill://other/1.2.0/ref.txt" }, { format: "unknown" }, { missingDigest: true }, { uri: "skill://officecli.officecli-docx/1.2.0/../ref.txt" } ]) {
    const result = await fetchDistributedSkill(caller, "t1", "officecli-docx", deps({ invoke: async () => ({ ok: true, data: {},
      content: [{ type: "text", text: "# Skill" }, { type: "resource", uri: "uri" in patch ? patch.uri : "skill://officecli.officecli-docx/1.2.0/ref.txt", mimeType: "text/plain", text: "text" in patch ? patch.text : "original" }],
      meta: { result_kind: "distributed", version_resolved: "1.2.0", delivery_digest: "missingDigest" in patch ? undefined : digest, delivery_digest_format: "format" in patch ? patch.format : "skill-package-v1" } }) }));
    assert.ok(!("content" in result)); if ("content" in result) continue;
    assert.match(result.status.reason ?? "", /integrity verification failed/);
  }
});

test("a legacy unverified package digest changes when a resource changes", async () => {
  const fetch = (text: string) => fetchDistributedSkill(caller, "t1", "officecli-docx", deps({ invoke: async () => ok({ content: [
    { type: "text", text: "# Same content" }, { type: "resource", uri: "skill://officecli.officecli-docx/stable/ref.txt", text },
  ] }) }));
  const first = await fetch("one"), second = await fetch("two");
  assert.ok("content" in first && "content" in second); if (!("content" in first && "content" in second)) return;
  assert.notEqual(first.contentDigest, second.contentDigest); assert.equal(first.deliveryIntegrity, "unverified");
});

// --- enumeration, and what happens when it comes back short ------------------
// The relay's answer drives DELETION on the Ruyin side (it prunes its
// product-distributed layer to whatever this catalogue names). That is why a
// short answer is a failure here rather than a smaller success.

test("list: enumerates with match-all, not a keyword that happens to read like one", async () => {
  const seen: Array<{ query: string; limit?: number; primitiveType?: string }> = [];
  await listDistributedSkills(
    caller,
    "t1",
    deps({
      discover: async (_cfg, query, opts) => {
        seen.push({ query, limit: opts.limit, primitiveType: opts.primitiveType });
        return ok({ capabilities: [skill("a.b", "x")], total: 1 });
      },
    }),
  );
  // "skill" was a keyword search all along: it returned only capabilities whose
  // text tokenised to that word, which is a fraction of the ledger.
  assert.equal(seen[0]?.query, "*");
  assert.equal(seen[0]?.primitiveType, "skill");
  assert.ok((seen[0]?.limit ?? 0) >= 288, "limit must clear the preset ledger");
});

test("list: total greater than returned is certain truncation - fail closed", async () => {
  const r = await listDistributedSkills(
    caller,
    "t1",
    deps({ discover: async () => ok({ capabilities: [skill("a.b", "x")], total: 288 }) }),
  );
  assert.equal(r.status.complete, false);
  // configured:false is the branch Ruyin already treats as "keep what you have".
  assert.equal(r.status.configured, false);
  assert.match(r.status.reason ?? "", /truncated: Runos matched 288/);
  assert.deepEqual(r.skills, []);
});

test("list: no total and exactly limit rows - suspect, and said out loud", async () => {
  const many = Array.from({ length: 500 }, (_, i) => skill(`a.s${i}`, "x"));
  const r = await listDistributedSkills(caller, "t1", deps({ discover: async () => ok({ capabilities: many }) }));
  assert.equal(r.status.complete, false);
  assert.match(r.status.reason ?? "", /possibly truncated/);
});

test("list: no total but fewer rows than the limit is a whole catalogue", async () => {
  const r = await listDistributedSkills(caller, "t1", deps());
  assert.equal(r.status.configured, true);
  assert.equal(r.status.complete, undefined);
  assert.equal(r.skills.length, 2);
});

test("truncationOf: the two cases, and the two that are not", () => {
  assert.match(truncationOf(200, 288) ?? "", /truncated: Runos matched 288/);
  assert.match(truncationOf(500, undefined) ?? "", /possibly truncated/);
  // Matched exactly what came back - whole.
  assert.equal(truncationOf(288, 288), undefined);
  // A total below the returned count is nonsense, but it is not truncation:
  // do not invent a failure out of a number we cannot interpret.
  assert.equal(truncationOf(5, 3), undefined);
});

test("list: reads all 879 skills over opaque pages before publishing a catalog", async () => {
  const all = Array.from({ length: 879 }, (_, i) => skill(`synthetic.skill-${i}`, "Synthetic skill"));
  const cursors: Array<string | undefined> = [];
  const result = await listDistributedSkills(caller, "task-pages", deps({ discover: async (_cfg, query, opts) => {
    assert.equal(query, "*"); assert.equal(opts.taskId, "task-pages"); assert.equal(opts.identity, caller.mint);
    cursors.push(opts.cursor);
    return ok(opts.cursor ? { capabilities: all.slice(500), total: all.length } : { capabilities: all.slice(0, 500), total: all.length, next_cursor: "opaque-page-two" });
  } }));
  assert.equal(result.status.configured, true);
  assert.equal(result.skills.length, 879);
  assert.deepEqual(cursors, [undefined, "opaque-page-two"]);
});

test("list: a failed or inconsistent later page never exposes a partial catalog", async () => {
  for (const fault of ["failure", "transport", "total", "duplicate-id", "duplicate-name", "cursor", "empty", "short", "invalid", "too-many"] as const) {
    let count = 0;
    const result = await listDistributedSkills(caller, "task-pages", deps({ discover: async () => {
      if (++count === 1) return ok({ capabilities: [skill("a.first", "A")], total: 3, next_cursor: "again" });
      if (fault === "failure") return fail("CALLER_INVALID_ARGUMENTS");
      if (fault === "transport") throw new Error("Synthetic transport lost");
      if (fault === "total") return ok({ capabilities: [skill("b.second", "B")], total: 4 });
      if (fault === "duplicate-id") return ok({ capabilities: [skill("a.first", "A")], total: 3 });
      if (fault === "duplicate-name") return ok({ capabilities: [skill("b.first", "B"), skill("b.third", "C")], total: 3 });
      if (fault === "cursor") return ok({ capabilities: [skill("b.second", "B")], total: 3, next_cursor: "again" });
      if (fault === "empty") return ok({ capabilities: [], total: 3, next_cursor: "different" });
      if (fault === "invalid") return ok({ capabilities: [skill("b.second", "B")], total: -1 });
      if (fault === "too-many") return ok({ capabilities: [skill("b.second", "B"), skill("b.third", "C"), skill("b.fourth", "D")], total: 3 });
      return ok({ capabilities: [skill("b.second", "B")], total: 3 });
    } }));
    assert.equal(result.status.configured, false, fault);
    assert.equal(result.status.complete, false, fault);
    assert.deepEqual(result.skills, [], fault);
    assert.equal(count, 2, fault);
  }
});

test("list: bounded paging rejects malformed, ambiguous and endless catalogs", async () => {
  for (const data of [null, { capabilities: null }, { capabilities: [], total: 20001 },
      { capabilities: [skill("a.bad_name", "A")] }, { capabilities: [skill("a.first", "A"), skill("b.first", "B")] },
      { capabilities: [skill("a.first", "A")], total: 2, next_cursor: "" }]) {
    const result = await listDistributedSkills(caller, "t", deps({ discover: async () => ok(data as never) }));
    assert.equal(result.status.complete, false); assert.deepEqual(result.skills, []);
  }
  let pages = 0;
  const result = await listDistributedSkills(caller, "t", deps({ discover: async () => {
    pages++;return ok({ capabilities: [skill(`a.item-${pages}`, "A")], total: 1000, next_cursor: `cursor-${pages}` });
  } }));
  assert.equal(pages, 200); assert.equal(result.status.complete, false); assert.deepEqual(result.skills, []);
});

test("product source bindings resolve ambiguity explicitly and refresh for new requests", async () => {
  const before = process.env.RUNOS_SKILL_BINDINGS;
  const capabilities = [skill("provider-a.docx", "A"), skill("provider-b.docx", "B")];
  const config = () => ({ ...defaultSkillsRelayDeps(), cfg, discover: async () => ok({ capabilities, total: 2 }) });
  try {
    delete process.env.RUNOS_SKILL_BINDINGS;
    assert.equal((await listDistributedSkills(caller, "t", config())).status.complete, false);
    process.env.RUNOS_SKILL_BINDINGS = '{"docx":"provider-a.docx"}';
    assert.equal((await listDistributedSkills(caller, "t", config())).skills[0]?.capabilityId, "provider-a.docx");
    process.env.RUNOS_SKILL_BINDINGS = '{"docx":"provider-b.docx"}';
    assert.equal((await listDistributedSkills(caller, "t", config())).skills[0]?.capabilityId, "provider-b.docx");
    for (const invalid of ['null', '[]', '{"docx":7}', '{"docx":"provider.wrong"}', '{"docx":"other.docx"}', '{"absent":"provider.absent"}', 'invalid-json']) {
      process.env.RUNOS_SKILL_BINDINGS = invalid;
      const result = await listDistributedSkills(caller, "t", config());
      assert.equal(result.status.complete, false, invalid); assert.deepEqual(result.skills, [], invalid);
    }
  } finally {
    if (before === undefined) delete process.env.RUNOS_SKILL_BINDINGS; else process.env.RUNOS_SKILL_BINDINGS = before;
  }
});
