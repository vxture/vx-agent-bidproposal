import { createHash } from "node:crypto";
import {
  getRunosClientConfig,
  runosDiscover,
  runosInvoke,
  runosResolve,
  type RunosClientConfig,
  type RunosFailure,
} from "../runos/client";
import type { CapabilityCaller } from "./caller";

// Skill distribution relay (vxture-ruyin ADR-020 section 3c, ADR-018 v2.2).
//
// Runos catalogues Skills and DISTRIBUTES them - it never executes one (Runos
// ADR-006 / ADR-009). Execution happens in the agent runtime, which is Ruyin on
// the user's machine. Ruyin cannot reach Runos itself (zero-secret public
// client), so bid's capability surface fetches on the user's behalf and hands
// the content over:
//
//   GET /products/bid/skills          -> catalogue: name, description, id@version
//   GET /products/bid/skills/:name    -> SKILL.md text + resources + content_digest
//
// Ruyin files these into its "product-distributed" source layer and caches by
// digest, so a skill fetched once keeps working offline.

export interface DistributedSkillSummary {
  name: string;
  description: string;
  capabilityId: string;
  version: string;
}

export interface DistributedSkill extends DistributedSkillSummary {
  /** The SKILL.md text, verbatim from Runos. */
  content: string;
  /** `skill://<capability_id>/<version>/<path>` resources, scoped to this response. */
  resources: Array<{ uri: string; mimeType?: string; text?: string; blob?: string }>;
  /** Runos's digest when it sent one; otherwise sha256 of the content, and we say so. */
  contentDigest: string;
  digestSource: "runos" | "computed";
}

export interface SkillsStatus {
  configured: boolean;
  /** Present only when not configured: the honest reason, never a fake empty catalogue. */
  reason?: string;
}

/**
 * Skill name = the kebab-case tail of the Runos capability id (`{provider}.{name}`),
 * which is also what the Agent Skills standard requires of `SKILL.md`'s `name`.
 */
export function skillNameOf(capabilityId: string): string {
  const tail = capabilityId.split(".").pop() ?? capabilityId;
  return tail.toLowerCase();
}

/** One line for a Runos failure envelope, whichever fields it carried. */
function describeFailure(f: RunosFailure): string {
  const rec = f as unknown as Record<string, unknown>;
  const code = rec["code"] ?? rec["error_code"] ?? rec["error_class"];
  const msg = rec["message"];
  return [code, msg].filter((v) => typeof v === "string" && v).join(": ") || "unknown failure";
}

function digestOf(text: string): string {
  return "sha256:" + createHash("sha256").update(text).digest("hex");
}

export interface SkillsRelayDeps {
  cfg: RunosClientConfig | null;
  discover: typeof runosDiscover;
  resolve: typeof runosResolve;
  invoke: typeof runosInvoke;
}

export function defaultSkillsRelayDeps(): SkillsRelayDeps {
  return { cfg: getRunosClientConfig(), discover: runosDiscover, resolve: runosResolve, invoke: runosInvoke };
}

export async function listDistributedSkills(
  caller: CapabilityCaller,
  taskId: string,
  deps: SkillsRelayDeps = defaultSkillsRelayDeps(),
): Promise<{ status: SkillsStatus; skills: DistributedSkillSummary[] }> {
  if (!deps.cfg) {
    return { status: { configured: false, reason: "RUNOS_API_URL is unset on this deployment" }, skills: [] };
  }
  const opts = { taskId, identity: caller.mint };
  // Discovery is over the ENTITLED surface: a skill outside bid's grants is
  // invisible here, not forbidden - that is Runos's design, and it is why the
  // catalogue is asked for rather than hard-coded.
  const found = await deps.discover(deps.cfg, "skill", { ...opts, limit: 200, primitiveType: "skill" });
  if (!found.ok) {
    return { status: { configured: true, reason: `runos_discover failed: ${describeFailure(found.failure)}` }, skills: [] };
  }
  const skills: DistributedSkillSummary[] = [];
  for (const c of found.data.capabilities) {
    if (c.primitive_type !== "skill") continue;
    skills.push({
      name: skillNameOf(c.capability_id),
      description: c.summary ?? c.title ?? "",
      capabilityId: c.capability_id,
      // discover returns stable versions only (Runos 210 section 4); the exact
      // version comes back on the fetch.
      version: "stable",
    });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { status: { configured: true }, skills };
}

export async function fetchDistributedSkill(
  caller: CapabilityCaller,
  taskId: string,
  name: string,
  deps: SkillsRelayDeps = defaultSkillsRelayDeps(),
): Promise<DistributedSkill | { status: SkillsStatus; notFound?: boolean }> {
  const listed = await listDistributedSkills(caller, taskId, deps);
  if (!listed.status.configured || !deps.cfg) return { status: listed.status };
  const hit = listed.skills.find((s) => s.name === name);
  if (!hit) return { status: listed.status, notFound: true };

  const opts = { taskId, identity: caller.mint };
  const contract = await deps.resolve(deps.cfg, hit.capabilityId, { ...opts, version: hit.version });
  if (!contract.ok) return { status: { configured: true, reason: `runos_resolve failed: ${describeFailure(contract.failure)}` } };

  // A Skill's only operation is `fetch` (Runos 120 section 4.3); invoking it is a
  // DISTRIBUTION event on Runos's ledger, not an execution.
  const fetched = await deps.invoke(deps.cfg, hit.capabilityId, "fetch", {}, { ...opts, version: hit.version });
  if (!fetched.ok) return { status: { configured: true, reason: `runos_invoke(fetch) failed: ${describeFailure(fetched.failure)}` } };

  const raw = fetched.data as {
    content?: Array<{ type: string; text?: string; uri?: string; mimeType?: string; blob?: string }>;
    _meta_vxture?: { content_digest?: string; result_kind?: string };
  };
  const blocks = Array.isArray(raw.content) ? raw.content : [];
  const text = blocks.find((b) => b.type === "text")?.text ?? "";
  const resources = blocks
    .filter((b) => b.type === "resource" && typeof b.uri === "string")
    .map((b) => ({ uri: b.uri as string, ...(b.mimeType ? { mimeType: b.mimeType } : {}), ...(b.text ? { text: b.text } : {}), ...(b.blob ? { blob: b.blob } : {}) }));
  const runosDigest = raw._meta_vxture?.content_digest;
  const resolvedVersion = (fetched.meta as { version_resolved?: string } | undefined)?.version_resolved ?? hit.version;
  return {
    ...hit,
    version: resolvedVersion,
    content: text,
    resources,
    contentDigest: runosDigest ?? digestOf(text),
    digestSource: runosDigest ? "runos" : "computed",
  };
}
