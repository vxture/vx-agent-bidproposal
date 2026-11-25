export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
export interface AssistantConversation {
  id: string;
  title: string;
  projectId?: string;
  messages: AssistantMessage[];
  updatedAt: string;
  revision: number;
  state: "ready" | "running" | "failed";
  requestId?: string;
  archived?: boolean;
}
