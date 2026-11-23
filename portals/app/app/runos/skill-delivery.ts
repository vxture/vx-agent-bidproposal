import { createHash } from "node:crypto";
import { RunosError, type RunosContentBlock, type RunosCallMeta } from "./client";

export interface SkillDelivery {
  content: string;
  resources: Array<{ uri: string; mimeType?: string; text?: string; blob?: string }>;
  integrity: "verified" | "unverified";
  digest?: string;
}

/** Verify the published skill-package-v1 bytes before following instructions.
 * A legacy response may be inspected, but is explicitly unverified.
 */
export function readSkillDelivery(capabilityId: string, version: string, blocks: RunosContentBlock[], meta?: RunosCallMeta): SkillDelivery {
  if (blocks[0]?.type !== "text" || typeof blocks[0].text !== "string" ||
      (meta?.result_kind !== undefined && meta.result_kind !== "distributed")) {
    throw new RunosError(502, "Runos returned no skill instruction package");
  }
  const content = blocks[0].text;
  const resources = blocks.filter(b => b.type === "resource" && typeof b.uri === "string")
    .map(b => ({ uri: b.uri as string, ...(typeof b.mimeType === "string" ? { mimeType: b.mimeType } : {}),
      ...(typeof b.text === "string" ? { text: b.text } : {}), ...(typeof b.blob === "string" ? { blob: b.blob } : {}) }));
  const claimed = meta?.delivery_digest;
  const format = meta?.delivery_digest_format;
  if (claimed === undefined && format === undefined) return { content, resources, integrity: "unverified" };
  const prefix = `skill://${capabilityId}/${version}/`;
  const paths = resources.map(resource => resource.uri.slice(prefix.length));
  const digest = createHash("sha256").update(JSON.stringify({ content, resources: resources.map(resource => ({
    mimeType: resource.mimeType, path: resource.uri.slice(prefix.length), text: resource.text,
  })) })).digest("hex");
  if (format !== "skill-package-v1" || !claimed || !/^[0-9a-f]{64}$/.test(claimed) ||
      blocks.length !== resources.length + 1 || resources.some(resource => !resource.uri.startsWith(prefix) ||
        typeof resource.text !== "string" || resource.blob !== undefined) ||
      paths.some(path => !path || path.includes("\\") || path.split("/").some(part => !part || part === "." || part === "..")) ||
      new Set(paths).size !== paths.length || claimed !== digest) {
    throw new RunosError(502, "Runos skill delivery integrity verification failed; package refused");
  }
  return { content, resources, integrity: "verified", digest };
}
