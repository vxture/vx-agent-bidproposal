import { createHash } from "node:crypto";
import {
  getRunosClientConfig,
  RUNOS_MATCH_ALL,
  runosDiscover,
  runosInvoke,
  runosResolve,
  type RunosClientConfig,
  type RunosCapability,
  type RunosFailure,
} from "../runos/client";
import type { CapabilityCaller } from "./caller";
import { readSkillDelivery, type SkillDelivery } from "../runos/skill-delivery";

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
  deliveryIntegrity: "verified" | "unverified";
  deliveryDigest?: string;
  deliveryDigestFormat?: "skill-package-v1";
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
const MAX_CATALOGUE_PAGES = 200;
const MAX_CATALOGUE_ENTRIES = 20_000;

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
  bindings?: Record<string, string>;
  bindingError?: string;
}

export function defaultSkillsRelayDeps(): SkillsRelayDeps {
  const base = { cfg: getRunosClientConfig(), discover: runosDiscover, resolve: runosResolve, invoke: runosInvoke };
  try {
    const bindings: unknown = JSON.parse(process.env.RUNOS_SKILL_BINDINGS ?? "{}");
    if (!bindings || typeof bindings !== "object" || Array.isArray(bindings) ||
        Object.entries(bindings).some(([name, id]) => typeof id !== "string" || skillNameOf(id) !== name)) {
      throw new Error("Invalid bindings");
    }
    return { ...base, bindings: bindings as Record<string, string> };
  } catch {
    return { ...base, bindingError: "RUNOS_SKILL_BINDINGS must map skill names to matching capability IDs" };
  }
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
  const incomplete = (reason: string) => ({ status: { configured: false, complete: false, reason }, skills: [] });
  if (deps.bindingError) return incomplete(deps.bindingError);
  const capabilities: RunosCapability[] = [];
  const cursors = new Set<string>();
  const ids = new Set<string>();
  let cursor: string | undefined;
  let total: number | undefined;
  for (let page = 0; page < MAX_CATALOGUE_PAGES; page++) {
    let found: Awaited<ReturnType<SkillsRelayDeps["discover"]>>;
    try {
      found = await deps.discover(deps.cfg, RUNOS_MATCH_ALL, { ...opts, limit: CATALOGUE_LIMIT, primitiveType: "skill", ...(cursor ? { cursor } : {}) });
    } catch (cause) {
      return incomplete(`runos_discover unavailable: ${cause instanceof Error ? cause.message : "transport failure"}`);
    }
    if (!found.ok) return incomplete(`runos_discover failed: ${describeFailure(found.failure)}`);
    const data = found.data;
    if (!data || !Array.isArray(data.capabilities)) return incomplete("Runos catalogue page is malformed");
    if (data.total !== undefined && (!Number.isSafeInteger(data.total) || data.total < 0 || data.total > MAX_CATALOGUE_ENTRIES)) {
      return incomplete("Runos catalogue total is invalid or exceeds the synchronization limit");
    }
    if (page === 0) total = data.total;
    else if (data.total !== total) return incomplete("Runos catalogue total changed while paging");
    for (const capability of data.capabilities) {
      if (!capability || typeof capability.capability_id !== "string" || !capability.capability_id || ids.has(capability.capability_id)) {
        return incomplete("Runos catalogue contains an invalid or duplicate capability ID");
      }
      ids.add(capability.capability_id);
      capabilities.push(capability);
    }
    if (capabilities.length > MAX_CATALOGUE_ENTRIES || (total !== undefined && capabilities.length > total)) {
      return incomplete("Runos catalogue count exceeds its declared total or synchronization limit");
    }
    const next = data.next_cursor;
    if (next === undefined) {
      const truncation = truncationOf(capabilities.length, total);
      if (truncation) return incomplete(truncation);
      break;
    }
    if (typeof next !== "string" || !next || cursors.has(next) || data.capabilities.length === 0 ||
        total === undefined || capabilities.length >= total || page === MAX_CATALOGUE_PAGES - 1) {
      return incomplete("Runos catalogue cursor is invalid, repeated or exceeds the synchronization limit");
    }
    cursors.add(next);
    cursor = next;
  }
  const skills: DistributedSkillSummary[] = [];
  const candidates = new Map<string, RunosCapability[]>();
  for (const c of capabilities) {
    if (c.primitive_type !== "skill") continue;
    const name = skillNameOf(c.capability_id);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) {
      return incomplete("Runos skill name is invalid");
    }
    candidates.set(name, [...(candidates.get(name) ?? []), c]);
  }
  for (const name of Object.keys(deps.bindings ?? {})) {
    if (!candidates.has(name)) return incomplete(`Configured Runos skill is absent from the caller catalog: ${name}`);
  }
  for (const [name, group] of candidates) {
    const selected = Object.prototype.hasOwnProperty.call(deps.bindings ?? {}, name) ? deps.bindings![name] : undefined;
    const c = selected ? group.find(item => item.capability_id === selected) : group.length === 1 ? group[0] : undefined;
    if (!c) return incomplete(`Runos skill source is ambiguous or unavailable: ${name}; configure RUNOS_SKILL_BINDINGS`);
    skills.push({
      name,
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
  const pinnedVersion = contract.data?.version;
  if (contract.data?.capability_id !== hit.capabilityId || !pinnedVersion || ["stable", "latest"].includes(pinnedVersion)) {
    return { status: { configured: true, reason: "Runos skill has no matching concrete resolved version" } };
  }

  // A Skill's only operation is `fetch` (Runos 120 section 4.3); invoking it is a
  // DISTRIBUTION event on Runos's ledger, not an execution.
  const fetched = await deps.invoke(deps.cfg, hit.capabilityId, "fetch", {}, { ...opts, version: pinnedVersion });
  if (!fetched.ok) return { status: { configured: true, reason: `runos_invoke(fetch) failed: ${describeFailure(fetched.failure)}` } };

  const raw = fetched.data as {
    content?: Array<{ type: string; text?: string; uri?: string; mimeType?: string; blob?: string }>;
  };
  const blocks = fetched.content ?? (Array.isArray(raw?.content) ? raw.content : []);
  const runosDigest = fetched.meta?.content_digest;
  const resolvedVersion = fetched.meta?.version_resolved ?? pinnedVersion;
  if (resolvedVersion !== pinnedVersion) return { status: { configured: true, reason: "Runos skill delivery returned another version" } };
  let delivery: SkillDelivery;
  try { delivery = readSkillDelivery(hit.capabilityId, resolvedVersion, blocks, fetched.meta); }
  catch (error) { return { status: { configured: true, reason: error instanceof Error ? error.message : "Invalid skill delivery" } }; }
  const { content: text, resources } = delivery;
  return {
    ...hit,
    version: resolvedVersion,
    content: text,
    resources,
    contentDigest: runosDigest ?? digestOf(JSON.stringify({ content: text, resources })),
    digestSource: runosDigest ? "runos" : "computed",
    deliveryIntegrity: delivery.integrity,
    ...(delivery.digest ? { deliveryDigest: delivery.digest, deliveryDigestFormat: "skill-package-v1" } : {}),
  };
}
