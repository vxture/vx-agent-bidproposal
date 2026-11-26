"use client";
/** Authorized workspace search reuses the product's existing catalog reads. */
import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Input, Icon } from "@vxture/design-system";
import type { ProjectCardData } from "@bidproposal/shared/presentation";
import { isTemplate, type ResourceData } from "@bidproposal/shared/resources";
import { libraryRequest } from "./resource-collection";

export function WorkspaceSearch({ open, onClose, projects, onNavigate }: {
  open: boolean;
  onClose: () => void;
  projects: ProjectCardData[];
  onNavigate: (target: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    if (!open) return;
    let active = true;
    setState("loading");
    setResources([]);
    void libraryRequest().then(value => {
      if (active) { setResources(value.items); setState("ready"); }
    }).catch(() => { if (active) setState("failed"); });
    return () => { active = false; };
  }, [open]);
  const term = query.trim().toLocaleLowerCase();
  const results = [
    ...projects.filter(item => !item.archivedAt).map(item => ({
      id: item.id, label: item.name, type: "\u9879\u76ee", icon: "file-text" as const,
      target: "#ws/" + item.id + "/overview",
    })),
    ...resources.map(item => ({
      id: item.id, label: item.name,
      type: isTemplate(item.category) ? "\u6a21\u677f" : "\u77e5\u8bc6",
      icon: isTemplate(item.category) ? "file-text" as const : "book-open" as const,
      target: (isTemplate(item.category) ? "#templates/" : "#library/") + item.id,
    })),
  ].filter(item => item.label.toLocaleLowerCase().includes(term));
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogContent className="jadera-workspace-search">
      <DialogTitle>{"\u641c\u7d22\u5f53\u524d\u5de5\u4f5c\u533a"}</DialogTitle>
      <Input value={query} onChange={event => setQuery(event.target.value)}
        aria-label={"\u641c\u7d22\u9879\u76ee\u3001\u77e5\u8bc6\u548c\u6a21\u677f"}
        placeholder={"\u9879\u76ee\u3001\u77e5\u8bc6\u3001\u6a21\u677f"} />
      {state === "loading" && <p role="status">{"\u6b63\u5728\u8bfb\u53d6\u8d44\u6599\u2026"}</p>}
      {state === "failed" && <p role="alert">{"\u8d44\u6599\u641c\u7d22\u6682\u4e0d\u53ef\u7528\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u540e\u91cd\u8bd5"}</p>}
      <div className="jadera-search-results">
        {results.map(item => <Button variant="ghost" key={item.type + item.id}
          onClick={() => { onClose(); onNavigate(item.target); }}>
          <Icon name={item.icon} size="sm" /><span title={item.label}>{item.label}</span><small>{item.type}</small>
        </Button>)}
        {!results.length && state === "ready" && <p>{"\u6ca1\u6709\u5339\u914d\u7684\u7ed3\u679c"}</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
