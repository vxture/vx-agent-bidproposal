"use client";
/** Authorized workspace search reuses the product's existing catalog reads. */
import { useEffect, useRef, useState } from "react";
import { Button, Input, Icon, ShellIconButton } from "@vxture/design-system";
import type { ProjectCardData } from "@bidproposal/shared/presentation";
import type { ResourceRequest } from "@bidproposal/shared/presentation";
import { isTemplate, type ResourceData } from "@bidproposal/shared/resources";
import { libraryRequest } from "./resource-collection";

export function WorkspaceSearch({
  open,
  onClose,
  projects,
  onNavigate,
  onOpen,
  request = libraryRequest,
}: {
  request?: ResourceRequest;
  onOpen: () => void;
  open: boolean;
  onClose: () => void;
  projects: ProjectCardData[];
  onNavigate: (target: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previouslyOpen = useRef(open);
  useEffect(() => {
    if (open) input.current?.focus();
    else if (previouslyOpen.current) trigger.current?.focus();
    previouslyOpen.current = open;
  }, [open]);
  const close = onClose;
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    if (!open) return;
    let active = true;
    setState("loading");
    setResources([]);
    void request()
      .then((value) => {
        if (active) {
          setResources(value.items);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("failed");
      });
    return () => {
      active = false;
    };
  }, [open, request]);
  const term = query.trim().toLocaleLowerCase();
  const results = [
    ...projects
      .filter((item) => !item.archivedAt)
      .map((item) => ({
        id: item.id,
        label: item.name,
        type: "\u9879\u76ee",
        icon: "file-text" as const,
        target: "#ws/" + item.id + "/overview",
      })),
    ...resources.map((item) => ({
      id: item.id,
      label: item.name,
      type: isTemplate(item.category) ? "\u6a21\u677f" : "\u77e5\u8bc6",
      icon: isTemplate(item.category)
        ? ("file-text" as const)
        : ("book-open" as const),
      target:
        (isTemplate(item.category) ? "#templates/" : "#library/") +
        (item.resourceNumber || item.id),
    })),
  ].filter((item) => item.label.toLocaleLowerCase().includes(term));
  return (
    <div
      className="jadera-header-search"
      data-open={open}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
    >
      {!open && (
        <ShellIconButton
          ref={trigger}
          icon="search"
          label={"\u641c\u7d22\u5f53\u524d\u5de5\u4f5c\u533a"}
          onClick={() => (open ? close() : onOpen())}
          aria-expanded={open}
        />
      )}
      {open && (
        <>
          <Input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={
              "\u641c\u7d22\u9879\u76ee\u3001\u77e5\u8bc6\u548c\u6a21\u677f"
            }
            placeholder={"\u9879\u76ee\u3001\u77e5\u8bc6\u3001\u6a21\u677f"}
          />
          {term && (
            <div className="jadera-header-search-results">
              {state === "loading" && (
                <p role="status">
                  {"\u6b63\u5728\u8bfb\u53d6\u8d44\u6599\u2026"}
                </p>
              )}
              {state === "failed" && (
                <p role="alert">
                  {
                    "\u8d44\u6599\u641c\u7d22\u6682\u4e0d\u53ef\u7528\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u540e\u91cd\u8bd5"
                  }
                </p>
              )}
              <div className="jadera-search-results">
                {results.map((item) => (
                  <Button
                    variant="ghost"
                    key={item.type + item.id}
                    onClick={() => {
                      close();
                      onNavigate(item.target);
                    }}
                  >
                    <Icon name={item.icon} size="sm" />
                    <span title={item.label}>{item.label}</span>
                    <small>{item.type}</small>
                  </Button>
                ))}
                {!results.length && state === "ready" && (
                  <p>{"\u6ca1\u6709\u5339\u914d\u7684\u7ed3\u679c"}</p>
                )}
              </div>
            </div>
          )}
          <ShellIconButton
            icon="x"
            label={"\u6536\u8d77\u641c\u7d22"}
            onClick={close}
          />
        </>
      )}
    </div>
  );
}
