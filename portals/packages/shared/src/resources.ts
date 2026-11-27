export const RESOURCE_CATEGORIES = {
  reference: "\u53c2\u8003\u8d44\u6599",
  qualification: "\u4f01\u4e1a\u8d44\u8d28",
  staff: "\u4eba\u5458\u8d44\u6599",
  product: "\u4f01\u4e1a\u4ea7\u54c1",
  solution: "\u65b9\u6848\u8d44\u6599",
  case: "\u9879\u76ee\u6848\u4f8b",
  template_business: "\u901a\u7528\u5546\u52a1\u6807\u4e66",
  template_technical: "\u901a\u7528\u6280\u672f\u6807\u4e66",
  template_software: "\u8f6f\u4ef6\u6280\u672f\u6807\u4e66",
  template_engineering: "\u5de5\u7a0b\u6280\u672f\u6807\u4e66",
  template_service: "\u670d\u52a1\u6280\u672f\u6807\u4e66",
  template_other: "\u5176\u4ed6\u6807\u4e66\u6a21\u677f",
} as const;
export const isTemplate = (category: string) =>
  category.startsWith("template_");
export type ResourceChangeSource = "upload" | "local_import" | "metadata" | "office" | "api";
export interface ResourcePerson {
  id: string;
  name?: string;
  avatarSrc?: string;
}
export interface ResourceReference {
  projectId: string;
  projectName: string;
  compilationLabel: string;
  owner?: ResourcePerson;
  version: number;
  referencedAt: string;
  archived?: boolean;
}
export interface ResourceMetadataInput {
  name: string;
  resourceNumber?: string;
  shortName?: string;
  category: string;
  description?: string;
  usageNotes?: string;
  tags?: string[];
  revision?: number;
}
export interface ResourceData {
  id: string;
  name: string;
  resourceNumber?: string;
  shortName?: string;
  category: string;
  updatedAt: string;
  revision?: number;
  description?: string;
  usageNotes?: string;
  tags?: string[];
  createdAt?: string;
  createdBy?: ResourcePerson;
  updatedBy?: ResourcePerson;
  createdVia?: ResourceChangeSource;
  updatedVia?: ResourceChangeSource;
  versions: {
    version: number;
    name: string;
    hash: string;
    bytes: number;
    readingId: string;
    addedAt?: string;
    uploadedBy?: ResourcePerson;
    source?: ResourceChangeSource;
    reading?: { state: string; units: number; flags: string[]; error?: string };
  }[];
}
export function resourceTitle(item: Pick<ResourceData, "name" | "shortName">) {
  return item.shortName?.trim() || item.name.replace(/[.](pdf|docx|xlsx|pptx|md|png|jpe?g|webp|gif)$/i, "");
}
export function resourceState(item: ResourceData) {
  if (item.versions.at(-1) && !item.versions.at(-1)?.readingId) return "\u5df2\u4fdd\u5b58\u539f\u4ef6";
  const state = item.versions.at(-1)?.reading?.state;
  return state === "completed"
    ? "\u5df2\u8bfb\u53d6"
    : state === "failed"
      ? "\u8bfb\u53d6\u5931\u8d25"
      : state === "running"
        ? "\u8bfb\u53d6\u4e2d"
        : "\u5f85\u8bfb\u53d6";
}

export type ResourceDetailAction = "info" | "edit" | "upload" | "versions" | "references";

export function resourceDetailAction(value?: string): ResourceDetailAction {
  return value === "edit" || value === "upload" || value === "versions" || value === "references" ? value : "info";
}
