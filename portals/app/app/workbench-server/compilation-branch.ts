import { createHash } from "node:crypto";
import type { BidRuntime } from "./service";
import { readPlan, encodePlan } from "./compilations";
import { WorkbenchError } from "./identity";
import {
  COMPILATION_STAGES,
  type CompilationStage,
} from "@bidproposal/shared/compilations";
export const BRANCH_REVISIONS = "runtime_auth_branch_revisions";
export interface BranchSnapshot {
  sourceId: string;
  stage: CompilationStage;
  at: string;
  documents: { id: string; markdown: string; revision: number }[];
  files: {
    id: string;
    name: string;
    hash: string;
    bytes: number;
    mediaType: string;
    addedAt: string;
    base64: string;
  }[];
}
const rank = (stage: CompilationStage) =>
  COMPILATION_STAGES.findIndex((item) => item.id === stage);
export function availableBranchStages(
  service: BidRuntime,
  id: string,
): CompilationStage[] {
  const get = (key: string) => service.documents.get(id, "bidproposal", key),
    stages: CompilationStage[] = ["overview", "analysis"];
  const selection = get("bid_reading_selection"),
    readings = service.readings.list(id, "bidproposal");
  if (
    selection &&
    readings.some(
      (item) =>
        item.id === JSON.parse(selection.markdown).readingId &&
        item.state === "completed",
    ) &&
    service.documents.list(id, "bidproposal", "bid_analysis_manifest_").length
  )
    stages.push("requirements");
  const matrix = get("bid_requirements");
  if (
    matrix &&
    matrix.markdown
      .split("\n")
      .slice(4)
      .filter((line) => line.trim()).length
  ) {
    const confirmed = matrix.markdown
      .split("\n")
      .slice(4)
      .filter((line) => line.trim())
      .every((line) => line.split("|")[7]?.trim() === "yes");
    if (confirmed) {
      stages.push("planning");
      const plan = readPlan(get("bid_plan")?.markdown);
      if (plan.approved && plan.requirementsRevision === matrix.revision) {
        stages.push("chapters");
        const writing = get("bid_writing"),
          draft = get("bid_draft");
        if (draft && writing) {
          const value = JSON.parse(
            writing.markdown.slice("# Bid writing progress\n\n".length),
          );
          if (
            value.items?.length &&
            value.items.every((row: { state: string }) => row.state === "done")
          ) {
            stages.push("review");
            const review = get("bid_review");
            if (
              review &&
              service.jobs.get(
                id,
                "bidproposal",
                JSON.parse(review.markdown).spec?.id,
              )?.state === "completed"
            )
              stages.push("export");
          }
        }
      }
    }
  }
  return stages;
}
function phase(key: string): number | undefined {
  if (
    key === "bid_plan" ||
    key === "runtime_library_selection" ||
    /^runtime_read(unit|ing)_/.test(key)
  )
    return 0;
  if (/^bid_(reading_selection|analysis_|source_|clarification)/.test(key))
    return 1;
  if (key === "bid_requirements") return 2;
  if (/^bid_(plan_|evidence_)/.test(key)) return 3;
  if (/^bid_(draft|writing|chapter_)/.test(key)) return 4;
  if (/^bid_review/.test(key)) return 5;
  return undefined;
}
/** Freeze real upstream results before reserving an independent container. */
export async function captureBranch(
  service: BidRuntime,
  sourceId: string,
  stage: CompilationStage,
): Promise<BranchSnapshot> {
  if (!availableBranchStages(service, sourceId).includes(stage))
    throw new WorkbenchError(
      409,
      "BRANCH_STAGE_UNAVAILABLE",
      "\u6765\u6e90\u7248\u672c\u5c1a\u672a\u5177\u5907\u6b64\u8d77\u70b9\u6240\u9700\u7684\u6210\u679c\uff0c\u8bf7\u5148\u5b8c\u6210\u524d\u5e8f\u6b65\u9aa4",
    );
  if (
    service.jobs
      .list(sourceId, "bidproposal")
      .some(
        (job) => !["completed", "error", "cancelled"].includes(job.state),
      ) ||
    service.readings
      .list(sourceId, "bidproposal")
      .some((job) => ["queued", "running"].includes(job.state))
  )
    throw new WorkbenchError(
      409,
      "BRANCH_SOURCE_BUSY",
      "\u6765\u6e90\u7248\u672c\u8fd8\u6709\u672a\u7ed3\u675f\u7684\u4efb\u52a1\uff0c\u8bf7\u5b8c\u6210\u6216\u53d6\u6d88\u540e\u518d\u521b\u5efa\u5206\u652f",
    );
  const completedReadings = service.readings
    .list(sourceId, "bidproposal")
    .filter((job) => job.state === "completed");
  const boundary = rank(stage),
    all = service.documents.list(sourceId, "bidproposal", "");
  const documents = all
    .filter((doc) => {
      if (
        doc.id.startsWith("runtime_reading_") &&
        JSON.parse(doc.markdown).state !== "completed"
      )
        return false;
      if (
        doc.id.startsWith("runtime_readunit_") &&
        !completedReadings.some((job) =>
          doc.id.startsWith("runtime_readunit_" + job.id + "_"),
        )
      )
        return false;
      // A saved request must never recreate a cancelled/failed source job on reopen.
      if (doc.markdown.startsWith("{")) {
        const value = JSON.parse(doc.markdown);
        if (
          value.spec?.id &&
          service.jobs.get(sourceId, "bidproposal", value.spec.id)?.state !==
            "completed"
        )
          return false;
      }
      const p = phase(doc.id);
      return p !== undefined && p < boundary;
    })
    .map((doc) => ({ ...doc }));
  // The plan combines configuration and the later outline. Keep only the config before drafting.
  const sourcePlan = readPlan(
    service.documents.get(sourceId, "bidproposal", "bid_plan")?.markdown,
  );
  const plan =
    boundary <= 3
      ? {
          ...sourcePlan,
          outline: [],
          approved: false,
          requirementsRevision: 0,
          template: null,
        }
      : sourcePlan;
  const prior = documents.find((doc) => doc.id === "bid_plan");
  if (prior) {
    if (boundary <= 3) prior.markdown = encodePlan(plan);
  } else
    documents.push({ id: "bid_plan", markdown: encodePlan(plan), revision: 1 });
  // Retain only completed job evidence referenced by upstream pointers; never copy live tasks.
  for (const doc of all.filter((doc) => doc.id.startsWith("runtime_job_"))) {
    const job = JSON.parse(doc.markdown);
    if (
      job.state !== "completed" ||
      !documents.some((item) => item.markdown.includes(job.id))
    )
      continue;
    documents.push(doc);
    for (const step of job.steps || []) {
      const result = all.find((item) => item.id === step.resultDocument);
      if (result && !documents.some((item) => item.id === result.id))
        documents.push(result);
    }
  }
  const store = service.storage.openHostStore(sourceId)!,
    area = service.storage.openFileStore(sourceId)!,
    files: BranchSnapshot["files"] = [];
  for (const file of store.listFiles()) {
    const bytes = await area.read(file.hash);
    if (createHash("sha256").update(bytes).digest("hex") !== file.hash)
      throw new WorkbenchError(
        409,
        "BRANCH_SOURCE_CHANGED",
        "\u6765\u6e90\u539f\u4ef6\u6821\u9a8c\u5931\u8d25",
      );
    files.push({ ...file, base64: bytes.toString("base64") });
  }
  return { sourceId, stage, at: new Date().toISOString(), documents, files };
}
/** Store offsets so source revision bindings survive without replaying fake edits. */
export async function restoreBranch(
  service: BidRuntime,
  id: string,
  snapshot: BranchSnapshot,
) {
  const store = service.storage.openHostStore(id)!,
    area = service.storage.openFileStore(id)!;
  for (const { base64, ...file } of snapshot.files) {
    if (store.getFile(file.id)) continue;
    const bytes = Buffer.from(base64, "base64"),
      stored = await area.putBytes(bytes);
    if (stored.hash !== file.hash)
      throw Error("Branch file integrity mismatch");
    store.addFile({ ...file, ...stored });
  }
  const offsets: Record<string, number> = {};
  for (const doc of snapshot.documents) {
    const old = store.getProductDocument("bidproposal", doc.id);
    if (
      !old &&
      !store.putProductDocument("bidproposal", doc.id, doc.markdown, 0)
    )
      throw Error("Branch document conflict");
    if (old && (old.markdown !== doc.markdown || old.revision !== 1))
      throw Error("Branch initialization changed");
    offsets[doc.id] = doc.revision - 1;
  }
  const old = store.getProductDocument("bidproposal", BRANCH_REVISIONS);
  if (
    !old &&
    !store.putProductDocument(
      "bidproposal",
      BRANCH_REVISIONS,
      JSON.stringify(offsets),
      0,
    )
  )
    throw Error("Branch revision conflict");
  const key = "runtime_compilation_origin";
  if (!store.getProductDocument("bidproposal", key))
    store.putProductDocument(
      "bidproposal",
      key,
      JSON.stringify({
        sourceId: snapshot.sourceId,
        stage: snapshot.stage,
        at: snapshot.at,
        documents: snapshot.documents.map(({ id, revision, markdown }) => ({
          id,
          revision,
          hash: createHash("sha256").update(markdown).digest("hex"),
        })),
        files: snapshot.files.map(({ id, hash }) => ({ id, hash })),
      }),
      0,
    );
}
