/** Compilation metadata is separate from the immutable runtime project identity. */
export interface WritingRequirements {
  pages: number;
  figures: "none" | "selective" | "rich";
  mode: "metrics" | "providers";
  providers: string;
  quality: "very-high" | "high" | "normal";
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
