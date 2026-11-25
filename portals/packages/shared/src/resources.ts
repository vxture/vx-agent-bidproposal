export const RESOURCE_CATEGORIES = {
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
export interface ResourceData {
  id: string;
  name: string;
  category: string;
  updatedAt: string;
  versions: {
    version: number;
    name: string;
    hash: string;
    bytes: number;
    readingId: string;
    reading?: { state: string; units: number; flags: string[]; error?: string };
  }[];
}
export function resourceState(item: ResourceData) {
  const state = item.versions.at(-1)?.reading?.state;
  return state === "completed"
    ? "\u5df2\u8bfb\u53d6"
    : state === "failed"
      ? "\u8bfb\u53d6\u5931\u8d25"
      : state === "running"
        ? "\u8bfb\u53d6\u4e2d"
        : "\u5f85\u8bfb\u53d6";
}
