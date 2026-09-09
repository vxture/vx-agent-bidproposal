import { createHash } from "node:crypto";
import {
  getRunosClientConfig,
  RUNOS_MATCH_ALL,
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
// client), so bidproposal's capability surface fetches on the user's behalf and hands
// the content over:
//
//   GET /products/bidproposal/skills          -> catalogue: name, description, id@version
//   GET /products/bidproposal/skills/:name    -> SKILL.md text + resources + content_digest
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
  /**
   * False when the catalogue we got back is known (or suspected) to be partial.
   * Ruyin PRUNES its product-distributed layer against this list - anything not
   * named here is deleted locally. So a truncated catalogue does not merely
   * under-report: it destroys skills the user already has. When this is false we
   * also report `configured: false`, because that is the branch Ruyin already
   * treats as "leave the local copy alone".
   */
  complete?: boolean;
}

/**
 * Skill name = the kebab-case tail of the Runos capability id (`{provider}.{name}`),
 * which is also what the Agent Skills standard requires of `SKILL.md`'s `name`.
 */
export function skillNameOf(capabilityId: string): string {
  const tail = capabilityId.split(".").pop() ?? capabilityId;
  return tail.toLowerCase();
}

/**
 * How many rows we ask for. Above the 288-entry preset ledger with room to grow;
 * Runos 210 section 4 caps it server-side anyway. The number only has to be large
 * enough that hitting it exactly is a signal rather than routine.
 */
const CATALOGUE_LIMIT = 500;

/**
 * Says whether the catalogue came back whole, and if not, why we think it did not.
 *
 * Two cases, and the second is why this is a function rather than one comparison:
 *
 * - `total` present (Runos #18 onward): it matched more than it returned. Certain.
 * - `total` absent (older deployment): the only evidence is that we got back
 *   exactly as many rows as we asked for. That is not proof - a ledger of exactly
 *   `limit` entries looks identical - but a caller whose answer drives deletion
 *   cannot afford to guess in the other direction.
 */
export function truncationOf(returned: number, total: number | undefined): string | undefined {
  if (typeof total === "number" && total > returned) {
    return `catalogue truncated: Runos matched ${total} capabilities, this call returned ${returned} (limit ${CATALOGUE_LIMIT})`;
  }
  if (total === undefined && returned >= CATALOGUE_LIMIT) {
    return `catalogue possibly truncated: got exactly the limit (${CATALOGUE_LIMIT}) and this Runos deployment does not report a total`;
  }
  return undefined;
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
  // Discovery is over the ENTITLED surface: a skill outside bidproposal's grants is
  // invisible here, not forbidden - that is Runos's design, and it is why the
  // catalogue is asked for rather than hard-coded.
  //
  // This is an ENUMERATION, not a search. It used to pass the literal string
  // "skill" as the query, which is a keyword search that merely looks like one:
  // only capabilities whose text tokenised to "skill" came back. Against a
  // 288-entry preset ledger that silently returned a fraction of the catalogue -
  // and a fraction is worse than nothing here, because Ruyin prunes against it.
  const found = await deps.discover(deps.cfg, RUNOS_MATCH_ALL, { ...opts, limit: CATALOGUE_LIMIT, primitiveType: "skill" });
  if (!found.ok) {
    return { status: { configured: true, reason: `runos_discover failed: ${describeFailure(found.failure)}` }, skills: [] };
  }
  const truncation = truncationOf(found.data.capabilities.length, found.data.total);
  if (truncation) {
    // Fail closed. Reporting `configured: false` is what makes Ruyin keep what it
    // has instead of pruning to a partial list; the reason says what actually
    // happened, so nobody reads this as "the surface has no Runos".
    return { status: { configured: false, complete: false, reason: truncation }, skills: [] };
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
