import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchDistributedSkill, listDistributedSkills, skillNameOf, type SkillsRelayDeps } from "./skills";
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
    resolve: async () => ok({} as RunosContract),
    invoke: async () =>
      ok(
        {
          content: [
            { type: "text", text: "---\nname: officecli-docx\n---\n# DOCX" },
            { type: "resource", uri: "skill://officecli.officecli-docx/1.2.0/references/REFERENCE.md", mimeType: "text/markdown", text: "ref" },
          ],
          _meta_vxture: { result_kind: "distributed", content_digest: "sha256:abc" },
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
  assert.equal(r.status.configured, true);
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
  }
});
