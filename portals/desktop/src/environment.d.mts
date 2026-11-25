export type NativeReply =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; error?: { message?: string } };

export interface NativeRuntime {
  request(method: string, path: string, body?: unknown): Promise<NativeReply>;
  review(id: string): void;
  onStage(listener: (stage: string) => void): () => void;
  replayNavigation(): void;
  publishNavigation(items: unknown[]): void;
  downloadUrl(path: string): string;
  close(): void;
}

export function createRuntime(options?: {
  href?: string;
  host?: Window;
  events?: Window;
  self?: Window;
}): NativeRuntime;
