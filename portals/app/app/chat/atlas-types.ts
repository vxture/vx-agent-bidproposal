// Atlas /v1 vocabulary at 75f05e0. Keep continuation state opaque, including
// unknown provider keys: rebuilding it from display text breaks tool rounds.
export type AtlasReasoning = Record<string, unknown>;
export interface AtlasToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
export interface AtlasMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: AtlasToolCall[];
  toolCallId?: string;
  name?: string;
  reasoning?: AtlasReasoning;
}
export interface AtlasTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
export type AtlasToolChoice = "auto" | "none" | "required" | { type: "function"; name: string };
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
