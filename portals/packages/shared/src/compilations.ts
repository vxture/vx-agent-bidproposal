/** Compilation metadata is separate from the immutable runtime project identity. */
export interface WritingRequirements {
  pages: number;
  figures: "none" | "selective" | "rich";
  mode: "metrics" | "providers";
  providers: string;
  quality: "very-high" | "high" | "normal" | "low";
  volume: "technical" | "commercial" | "combined";
  brief: string;
}
export const DEFAULT_REQUIREMENTS: WritingRequirements = {
  pages: 80,
  figures: "selective",
  mode: "metrics",
  providers: "",
  quality: "high",
  volume: "combined",
  brief: "",
};
export interface CompilationVersion {
  id: string;
  number: number;
  label: string;
  createdAt: string;
  state: "creating" | "ready";
  startStages?: CompilationStage[];
  origin?: {sourceId:string;stage:CompilationStage;at:string};
}
export interface CompilationList {
  rootId: string;
  projectName: string;
  revision: number;
  items: CompilationVersion[];
}
export interface CompilationBrief {
  revision: number;
  value: WritingRequirements;
}
export function requirementsComplete(value: WritingRequirements) {
  return [
    value.pages > 0,
    !!value.volume,
    !!value.quality,
    !!value.figures,
    !!value.brief.trim(),
  ].filter(Boolean).length;
}

export const COMPILATION_STAGES = [
 {id:"overview",label:"\u7f16\u5199\u914d\u7f6e"}, {id:"analysis",label:"\u62db\u6807\u89e3\u8bfb"}, {id:"requirements",label:"\u9700\u6c42\u786e\u8ba4"}, {id:"planning",label:"\u7f16\u5199\u89c4\u5212"}, {id:"chapters",label:"\u6807\u4e66\u7f16\u5199"}, {id:"review",label:"\u5ba1\u6838\u4fee\u8ba2"}, {id:"export",label:"\u6210\u679c\u5bfc\u51fa"},
] as const;
export type CompilationStage = typeof COMPILATION_STAGES[number]["id"];
