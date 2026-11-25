import { createHash, randomUUID } from "node:crypto";
import type {
  AssistantConversation,
  AssistantMessage,
} from "@bidproposal/shared/assistant";
import { WorkbenchError, type Principal } from "./identity";

interface Store {
  getProductDocument(
    product: string,
    id: string,
  ): { markdown: string; revision: number } | undefined;
  listProductDocuments(
    product: string,
    prefix: string,
  ): { markdown: string; revision: number }[];
  putProductDocument(
    product: string,
    id: string,
    value: string,
    revision: number,
  ): unknown;
}
type Saved = Omit<AssistantConversation, "revision">;
export class AssistantSessions {
  private readonly running = new Set<string>();
  get activeCount() {
    return this.running.size;
  }
  constructor(
    private readonly store: Store,
    private readonly infer: (
      messages: AssistantMessage[],
      principal: Principal,
      projectId?: string,
    ) => Promise<string>,
  ) {}
  private prefix(principal: Principal) {
    return (
      "runtime_assistant_" +
      createHash("sha256").update(principal.sub).digest("hex") +
      "_"
    );
  }
  private key(principal: Principal, id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new WorkbenchError(404, "NOT_FOUND", "Conversation unavailable");
    return this.prefix(principal) + id;
  }
  private read(markdown: string, revision: number): AssistantConversation {
    const saved = JSON.parse(markdown) as Saved;
    return {
      ...saved,
      revision,
      state:
        saved.state === "running" && !this.running.has(saved.id)
          ? "failed"
          : saved.state,
    };
  }
  list(principal: Principal) {
    return this.store
      .listProductDocuments("bidproposal", this.prefix(principal))
      .map((row) => this.read(row.markdown, row.revision))
      .filter((row) => !row.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  get(principal: Principal, id: string) {
    const row = this.store.getProductDocument(
      "bidproposal",
      this.key(principal, id),
    );
    if (!row)
      throw new WorkbenchError(404, "NOT_FOUND", "Conversation unavailable");
    return this.read(row.markdown, row.revision);
  }
  private save(principal: Principal, conversation: AssistantConversation) {
    const { revision, ...saved } = conversation;
    if (
      !this.store.putProductDocument(
        "bidproposal",
        this.key(principal, saved.id),
        JSON.stringify(saved),
        revision,
      )
    )
      throw new WorkbenchError(
        409,
        "REVISION_CHANGED",
        "Conversation changed; reload before sending",
      );
    return this.get(principal, saved.id);
  }
  archive(principal: Principal, id: string, revision: number) {
    const saved = this.get(principal, id);
    if (this.running.has(id) || saved.revision !== revision)
      throw new WorkbenchError(
        409,
        "REVISION_CHANGED",
        "Conversation is busy or changed",
      );
    return this.save(principal, { ...saved, archived: true });
  }
  async send(
    principal: Principal,
    input: {
      id?: string;
      requestId: string;
      revision: number;
      message: string;
      projectId?: string;
    },
  ) {
    if (
      !/^[a-f0-9-]{36}$/.test(input.requestId) ||
      !Number.isSafeInteger(input.revision) ||
      input.revision < 0 ||
      typeof input.message !== "string" ||
      !input.message.trim() ||
      input.message.length > 12000
    )
      throw new WorkbenchError(
        400,
        "INVALID_INPUT",
        "Enter a message up to 12000 characters",
      );
    if (!input.id) {
      const previous = this.list(principal).find(
        (row) => row.requestId === input.requestId,
      );
      if (previous) return previous;
    }
    const id = input.id || randomUUID();
    if (this.running.has(id))
      throw new WorkbenchError(
        409,
        "CONVERSATION_BUSY",
        "Wait for the current answer",
      );
    if (this.running.size >= 4)
      throw new WorkbenchError(
        429,
        "ASSISTANT_BUSY",
        "The assistant is busy; try shortly",
      );
    const now = new Date().toISOString();
    let saved: AssistantConversation = input.id
      ? this.get(principal, id)
      : {
          id,
          title: input.message.trim().slice(0, 36),
          projectId: input.projectId,
          messages: [],
          state: "ready",
          updatedAt: now,
          revision: 0,
        };
    if (saved.archived)
      throw new WorkbenchError(
        409,
        "CONVERSATION_ARCHIVED",
        "Start a new conversation",
      );
    if (saved.requestId === input.requestId) return saved;
    if (saved.revision !== input.revision || saved.messages.length >= 60)
      throw new WorkbenchError(
        409,
        "REVISION_CHANGED",
        "Reload the conversation or start a new task",
      );
    if (!input.id && this.list(principal).length >= 200)
      throw new WorkbenchError(
        409,
        "CONVERSATION_LIMIT",
        "Archive an older conversation before starting another",
      );
    this.running.add(id);
    try {
      saved = this.save(principal, {
        ...saved,
        state: "running",
        requestId: input.requestId,
        updatedAt: now,
        messages: [
          ...saved.messages,
          { role: "user", content: input.message.trim(), createdAt: now },
        ],
      });
      const content = await this.infer(
        saved.messages,
        principal,
        saved.projectId,
      );
      if (
        typeof content !== "string" ||
        !content.trim() ||
        content.length > 100000
      )
        throw Error("Invalid assistant response");
      return this.save(principal, {
        ...saved,
        state: "ready",
        updatedAt: new Date().toISOString(),
        messages: [
          ...saved.messages,
          { role: "assistant", content, createdAt: new Date().toISOString() },
        ],
      });
    } catch (error) {
      if (saved.revision > 0 && saved.state === "running")
        return this.save(principal, { ...saved, state: "failed" });
      throw error;
    } finally {
      this.running.delete(id);
    }
  }
}
