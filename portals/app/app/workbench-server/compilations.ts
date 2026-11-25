import { randomUUID } from "node:crypto";
import type { ProjectRuntime } from "@vxture/ruyin-core";
import type { JobDocuments } from "@vxture/ruyin-node-runtime";
import {
  DEFAULT_REQUIREMENTS,
  type CompilationList,
  type CompilationVersion,
  type WritingRequirements,
} from "@bidproposal/shared/compilations";
import { WorkbenchError } from "./identity";

const prefix = "runtime_auth_compilation_";
const planPrefix = "# Bid writing plan\n\n```json\n";
interface Store {
  listProductDocuments(
    product: string,
    prefix: string,
  ): { markdown: string; revision: number }[];
  putProductDocument(
    product: string,
    id: string,
    text: string,
    revision: number,
  ): unknown;
}
interface Entry extends CompilationVersion {
  requestId?: string;
  requirements?: WritingRequirements;
  selections?: { id: string; version: number }[];
}
interface Group extends Omit<CompilationList, "items"> {
  items: Entry[];
}
const invalid = () =>
  new WorkbenchError(400, "INVALID_INPUT", "Invalid compilation requirements");
export function writingRequirements(input: unknown): WritingRequirements {
  if (!input || typeof input !== "object") throw invalid();
  const v = input as WritingRequirements;
  if (
    !Number.isInteger(v.pages) ||
    v.pages < 1 ||
    v.pages > 3000 ||
    !["none", "selective", "rich"].includes(v.figures) ||
    !["metrics", "providers"].includes(v.mode) ||
    !["very-high", "high", "normal"].includes(v.quality) ||
    !["technical", "commercial", "combined"].includes(v.volume) ||
    typeof v.providers !== "string" ||
    v.providers.length > 4000 ||
    typeof v.brief !== "string" ||
    v.brief.length > 4000
  )
    throw invalid();
  return {
    pages: v.pages,
    figures: v.figures,
    mode: v.mode,
    providers: v.mode === "metrics" ? "" : v.providers,
    quality: v.quality,
    volume: v.volume,
    brief: v.brief,
  };
}
export function readPlan(markdown?: string): Record<string, unknown> {
  if (!markdown)
    return {
      ...DEFAULT_REQUIREMENTS,
      outline: [],
      approved: false,
      requirementsRevision: 0,
      template: null,
    };
  if (!markdown.startsWith(planPrefix) || !markdown.endsWith("\n```\n"))
    throw new WorkbenchError(
      409,
      "PLAN_FORMAT",
      "Existing plan format must be reviewed before editing",
    );
  const value = JSON.parse(markdown.slice(planPrefix.length, -5));
  writingRequirements({ ...value, brief: value.brief ?? "" });
  return value;
}
export const encodePlan = (value: Record<string, unknown>) =>
  planPrefix + JSON.stringify(value, null, 2) + "\n```\n";

/** Each version gets an original runtime container, never a copied task/approval. */
export class CompilationVersions {
  constructor(
    private readonly store: Store,
    private readonly runtime: ProjectRuntime,
    private readonly docs: JobDocuments,
    private readonly createContainer: (
      id: string,
      name: string,
    ) => Promise<unknown>,
    private readonly pin: (
      id: string,
      resource: { id: string; version: number },
    ) => Promise<unknown>,
  ) {}
  private groups(): Group[] {
    return this.store
      .listProductDocuments("bidproposal", prefix)
      .map((row) => ({
        ...(JSON.parse(row.markdown) as Omit<Group, "revision">),
        revision: row.revision,
      }));
  }
  group(id: string) {
    return this.groups().find((group) =>
      group.items.some((item) => item.id === id),
    );
  }
  rootId(id: string) {
    return this.group(id)?.rootId ?? id;
  }
  hiddenIds() {
    return new Set(
      this.groups().flatMap((group) =>
        group.items
          .filter((item) => item.id !== group.rootId)
          .map((item) => item.id),
      ),
    );
  }
  isCreating(id: string) {
    return (
      this.group(id)?.items.some(
        (item) => item.id === id && item.state === "creating",
      ) ?? false
    );
  }
  async list(id: string): Promise<CompilationList> {
    const group = this.group(id);
    if (group)
      return {
        ...group,
        items: group.items.map(({ id, number, label, createdAt, state }) => ({
          id,
          number,
          label,
          createdAt,
          state,
        })),
      };
    const { meta } = await this.runtime.openProject(id);
    return {
      rootId: id,
      projectName: meta.name,
      revision: 0,
      items: [
        {
          id,
          number: 1,
          label: "V01",
          createdAt: meta.createdAt,
          state: "ready",
        },
      ],
    };
  }
  private save(group: Group) {
    const { revision, ...value } = group;
    if (
      !this.store.putProductDocument(
        "bidproposal",
        prefix + group.rootId,
        JSON.stringify(value),
        revision,
      )
    )
      throw new WorkbenchError(
        409,
        "COMPILATION_CONFLICT",
        "Versions changed; reload before creating",
      );
    group.revision++;
  }
  async create(
    id: string,
    input: {
      label: string;
      requestId: string;
      revision: number;
      requirements: unknown;
      selections: { id: string; version: number }[];
    },
  ) {
    if (
      typeof input.label !== "string" ||
      !input.label.trim() ||
      input.label.trim().length > 60 ||
      !/^[a-f0-9-]{36}$/.test(input.requestId) ||
      !Number.isSafeInteger(input.revision) ||
      input.revision < 0
    )
      throw invalid();
    const requirements = writingRequirements(input.requirements);
    const group: Group = this.group(id) ?? (await this.list(id));
    let entry = group.items.find((item) => item.requestId === input.requestId);
    if (!entry) {
      if (group.revision !== input.revision)
        throw new WorkbenchError(
          409,
          "COMPILATION_CONFLICT",
          "Versions changed; reload before creating",
        );
      if (group.items.length >= 20)
        throw new WorkbenchError(
          409,
          "COMPILATION_LIMIT",
          "A project supports up to 20 compilation versions",
        );
      entry = {
        id: "prj_" + randomUUID().replaceAll("-", ""),
        number: group.items.length + 1,
        label: input.label.trim(),
        createdAt: new Date().toISOString(),
        state: "creating",
        requestId: input.requestId,
        requirements,
        selections: input.selections,
      };
      group.items.push(entry);
      // Reserve the opaque ID before creating its container. A restart can finish it.
      this.save(group);
    }
    if (entry.state === "creating") await this.finish(group, entry);
    return { ...(await this.list(group.rootId)), selectedId: entry.id };
  }
  private async finish(group: Group, entry: Entry) {
    await this.createContainer(entry.id, group.projectName);
    if (!this.docs.get(entry.id, "bidproposal", "bid_plan")) {
      const value = { ...readPlan(), ...entry.requirements };
      if (
        !this.docs.put(
          entry.id,
          "bidproposal",
          "bid_plan",
          encodePlan(value),
          0,
        )
      )
        throw new WorkbenchError(
          409,
          "COMPILATION_CONFLICT",
          "Compilation initialization changed",
        );
    }
    for (const resource of entry.selections ?? [])
      await this.pin(entry.id, resource);
    entry.state = "ready";
    delete entry.requirements;
    delete entry.selections;
    this.save(group);
  }
  async recover() {
    for (const group of this.groups())
      for (const entry of group.items) {
        if (entry.state !== "creating") continue;
        try {
          await this.finish(group, entry);
        } catch {
          console.warn(
            "Compilation initialization is pending; retry the original request",
          );
        }
      }
  }
  async retry(id: string, versionId: string) {
    const group = this.group(id),
      entry = group?.items.find((item) => item.id === versionId);
    if (!group || !entry)
      throw new WorkbenchError(404, "NOT_FOUND", "Compilation unavailable");
    if (entry.state === "creating") await this.finish(group, entry);
    return { ...(await this.list(group.rootId)), selectedId: entry.id };
  }
}
