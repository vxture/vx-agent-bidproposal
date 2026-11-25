"use client";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Icon,
  ShellDock,
  ShellIconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Textarea,
} from "@vxture/design-system";
import type { AssistantConversation } from "../assistant";
export interface AssistantClient {
  list: () => Promise<Omit<AssistantConversation, "messages">[]>;
  get: (id: string) => Promise<AssistantConversation>;
  send: (input: {
    id?: string;
    projectId?: string;
    revision: number;
    requestId: string;
    message: string;
  }) => Promise<AssistantConversation>;
  archive: (id: string, revision: number) => Promise<unknown>;
}
export function AssistantDock({
  open,
  onClose,
  client,
  projectId,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  client: AssistantClient;
  projectId?: string;
  projectName?: string;
}) {
  const [wide, setWide] = useState(false),
    [conversation, setConversation] = useState<AssistantConversation>(),
    [sessions, setSessions] = useState<
      Omit<AssistantConversation, "messages">[]
    >([]);
  const [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [chooser, setChooser] = useState(false);
  const list = useRef<HTMLDivElement>(null),
    activeRequest = useRef(0),
    lastProject = useRef(projectId),
    retryRequest = useRef<{ message: string; id: string } | undefined>(
      undefined,
    );
  const reload = () =>
    void client
      .list()
      .then(setSessions)
      .catch(() =>
        setError(
          "\u4f1a\u8bdd\u6682\u65f6\u65e0\u6cd5\u8bfb\u53d6\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002",
        ),
      );
  useEffect(() => {
    if (open) reload();
  }, [open, client]);
  useEffect(() => {
    if (lastProject.current === projectId) return;
    if (busy) return;
    lastProject.current = projectId;
    if (!busy) {
      setConversation(undefined);
      setDraft("");
      setError("");
    }
  }, [projectId, busy]);
  useEffect(() => {
    if (!open || conversation?.state !== "running") return;
    const timer = setTimeout(() => {
      void client
        .get(conversation.id)
        .then(setConversation)
        .catch(() =>
          setError(
            "\u4f1a\u8bdd\u6682\u65f6\u65e0\u6cd5\u66f4\u65b0\uff0c\u8bf7\u7a0d\u540e\u91cd\u65b0\u6253\u5f00\u3002",
          ),
        );
    }, 3000);
    return () => clearTimeout(timer);
  }, [open, conversation, client]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [conversation?.messages.length, busy]);
  const select = async (id: string) => {
    const sequence = ++activeRequest.current;
    setError("");
    try {
      const value = await client.get(id);
      if (sequence !== activeRequest.current) return;
      setConversation(value);
      setChooser(false);
    } catch {
      setError(
        "\u4f1a\u8bdd\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u91cd\u65b0\u9009\u62e9\u3002",
      );
    }
  };
  const fresh = () => {
    if (busy) return;
    activeRequest.current++;
    setConversation(undefined);
    setDraft("");
    setError("");
    setChooser(false);
    retryRequest.current = undefined;
  };
  const send = async () => {
    if (busy || !draft.trim()) return;
    const message = draft.trim();
    setBusy(true);
    setError("");
    if (retryRequest.current?.message !== message)
      retryRequest.current = { message, id: crypto.randomUUID() };
    try {
      const value = await client.send({
        id: conversation?.id,
        revision: conversation?.revision || 0,
        requestId: retryRequest.current!.id,
        message,
        projectId: conversation?.projectId || projectId,
      });
      setConversation(value);
      if (value.state === "ready") setDraft("");
      else
        setError(
          "\u56de\u7b54\u672a\u5b8c\u6210\uff0c\u8f93\u5165\u548c\u4f1a\u8bdd\u5df2\u4fdd\u7559\uff0c\u53ef\u4ee5\u91cd\u8bd5\u3002",
        );
      retryRequest.current = undefined;
      reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "\u53d1\u9001\u672a\u5b8c\u6210\uff0c\u8bf7\u4fdd\u7559\u8f93\u5165\u5e76\u91cd\u8bd5\u3002",
      );
      if (conversation) void select(conversation.id);
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    if (!conversation || busy) return;
    try {
      await client.archive(conversation.id, conversation.revision);
      fresh();
      reload();
    } catch {
      setError(
        "\u4f1a\u8bdd\u5df2\u53d8\u5316\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u540e\u5f52\u6863\u3002",
      );
    }
  };
  if (!open) return null;
  return (
    <ShellDock
      mode={wide ? "wide" : "narrow"}
      className="jadera-assistant-dock"
    >
      <header className="jadera-dock-header">
        <div className="jadera-ai-title">
          <Icon name="sparkles" size="md" />
          <strong>{"\u745c\u7ae0"}</strong>
          <span>{"\u9010\u9879\u786e\u8ba4"}</span>
        </div>
        <div className="jadera-dock-actions">
          <ShellIconButton
            icon={wide ? "minimize" : "maximize"}
            label={
              wide ? "\u7a84\u5c4f\u6a21\u5f0f" : "\u5bbd\u5c4f\u6a21\u5f0f"
            }
            onClick={() => setWide(!wide)}
          />
          <ShellIconButton
            icon="plus"
            label={"\u65b0\u4efb\u52a1"}
            disabled={busy}
            onClick={fresh}
          />
          <Popover open={chooser} onOpenChange={setChooser}>
            <PopoverTrigger asChild>
              <ShellIconButton
                icon="clock-counter-clockwise"
                label={"\u5168\u90e8\u4f1a\u8bdd"}
                disabled={busy}
              />
            </PopoverTrigger>
            <PopoverContent align="end" className="jadera-session-picker">
              <strong>{"\u5168\u90e8\u4f1a\u8bdd"}</strong>
              {!sessions.length ? (
                <p>{"\u8fd8\u6ca1\u6709\u4f1a\u8bdd"}</p>
              ) : (
                sessions.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="jadera-session-row"
                    onClick={() => void select(item.id)}
                  >
                    <span>{item.title}</span>
                    <small>
                      {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                    </small>
                  </Button>
                ))
              )}
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ShellIconButton
                icon="more-vertical"
                label={"\u66f4\u591a\u4f1a\u8bdd\u64cd\u4f5c"}
                disabled={!conversation || busy}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void archive()}>
                {"\u5f52\u6863\u5f53\u524d\u4f1a\u8bdd"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ShellIconButton
            icon="x"
            label={"\u5173\u95ed AI \u9762\u677f"}
            onClick={onClose}
          />
        </div>
      </header>
      <div className="jadera-ai-scope">
        {conversation?.projectId
          ? "\u9879\u76ee\u4f1a\u8bdd"
          : projectName
            ? "\u5f53\u524d\u9879\u76ee \u00b7 " + projectName
            : "\u667a\u80fd\u5de5\u4f5c\u53f0"}
        {conversation && <span>{conversation.title}</span>}
      </div>
      <div
        className="jadera-ai-transcript"
        ref={list}
        role="log"
        aria-label={"AI \u4f1a\u8bdd"}
      >
        {!conversation?.messages.length ? (
          <div className="jadera-ai-greeting">
            <div>
              <Icon name="sparkles" size="2xl" />
            </div>
            <h2>
              {"\u6211\u4eec\u4ece\u54ea\u4efd\u6807\u4e66\u5f00\u59cb\uff1f"}
            </h2>
            <p>
              {
                "\u53ef\u4ee5\u4e00\u8d77\u68b3\u7406\u8d44\u6599\u3001\u63a8\u6572\u54cd\u5e94\u5185\u5bb9\uff0c"
              }
              <br />
              {
                "\u4e5f\u53ef\u4ee5\u76f4\u63a5\u8bf4\u8bf4\u4f60\u6b63\u5728\u5904\u7406\u7684\u95ee\u9898\u3002"
              }
            </p>
          </div>
        ) : (
          conversation.messages.map((message, i) => (
            <article key={i} className={"jadera-ai-message " + message.role}>
              <span>{message.role === "user" ? "\u4f60" : "\u745c\u7ae0"}</span>
              <div>{message.content}</div>
            </article>
          ))
        )}
        {busy && (
          <p role="status">
            {
              "\u6b63\u5728\u68b3\u7406\u2026 \u56de\u7b54\u4f1a\u968f\u4f1a\u8bdd\u4fdd\u7559\u3002"
            }
          </p>
        )}
        {conversation?.state === "failed" && !busy && (
          <p role="status">
            {
              "\u4e0a\u6b21\u56de\u7b54\u672a\u5b8c\u6210\uff0c\u5df2\u6709\u5185\u5bb9\u5df2\u4fdd\u7559\u3002"
            }
          </p>
        )}
      </div>
      <form
        className="jadera-ai-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {error && <p role="alert">{error}</p>}
        <Textarea
          aria-label={"\u53d1\u9001\u7ed9\u745c\u7ae0"}
          placeholder={"\u8bf4\u8bf4\u4f60\u7684\u7f16\u6807\u4efb\u52a1\u2026"}
          value={draft}
          maxLength={12000}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div>
          <span>
            {
              "\u5efa\u8bae\u4f9b\u4f60\u6838\u5bf9\uff0c\u5173\u952e\u5185\u5bb9\u7531\u4f60\u786e\u8ba4"
            }
          </span>
          <Button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={"\u53d1\u9001\u6d88\u606f"}
          >
            <Icon name="arrow-up" size="sm" />
          </Button>
        </div>
      </form>
    </ShellDock>
  );
}
