"use client";
import { useEffect, useState, useRef } from "react";
import { Button, Icon } from "@vxture/design-system";
import { usePageRefresh, ResourceVisualCard, ResourceActionsMenu, downloadResourceFile, type FileAccess, type ResourceRequest } from "@bidproposal/shared/presentation";
import {
  resourceCategoryLabel,
  resourceTitle,
  isTemplate,
  type ResourceData,
  type ResourceDetailAction,
} from "@bidproposal/shared/resources";
import { ResourcePreview, fileAccess as productFileAccess, libraryRequest } from "./resource-collection";
export function ResourceProgress({
  onKnowledge,
  onTemplates,
  tenantLabel,
  onOpenFile,
  fileAccess = productFileAccess,
  request = libraryRequest,
}: {
  tenantLabel?: string;
  onKnowledge: (id?: string, action?: ResourceDetailAction) => void;
  onTemplates: (id?: string, action?: ResourceDetailAction) => void;
  onOpenFile(id: string, version: number, templates: boolean): void;
  fileAccess?: FileAccess;
  request?: ResourceRequest;
}) {
  const [items, setItems] = useState<ResourceData[]>([]),
    [state, setState] = useState("loading"), [error, setError] = useState("");
  const loaded=useRef(false);
  const load=async(signal?:AbortSignal)=>{try{const value=await request("",{signal});if(signal?.aborted)return;setItems(value.items);loaded.current=true;setState("ready");}catch{if(!signal?.aborted){if(!loaded.current)setState("failed");else setError("\u8d44\u6599\u5237\u65b0\u5931\u8d25\uff0c\u73b0\u6709\u5185\u5bb9\u5df2\u4fdd\u7559\u3002");}}};
  usePageRefresh(()=>load());
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[request]);
  const download = async (item: ResourceData) => {
    const version = item.versions.at(-1); if (!version) return;
    setError("");
    try { await downloadResourceFile(fileAccess, item.id, version.version, version.name); }
    catch { setError("\u6587\u4ef6\u4e0b\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5"); }
  };
  return (
    <div className="jadera-resource-progress">
      {error && <p role="alert">{error}</p>}
      {[false, true].map((templates) => {
        const rows = items
            .filter((item) => isTemplate(item.category) === templates)
            .slice(0, 6),
          go = templates ? onTemplates : onKnowledge;
        return (
          <section key={String(templates)}>
            <div className="jadera-section-heading">
              <div>
                <h2>
                  {templates
                    ? "\u6a21\u677f\u7ba1\u7406"
                    : "\u77e5\u8bc6\u6c89\u6dc0"}
                </h2>
                <p>
                  {templates
                    ? "\u6309\u6807\u4e66\u7c7b\u578b\uff0c\u79ef\u7d2f\u5185\u5bb9\u4e0e\u7248\u5f0f"
                    : "\u8d44\u8d28\u3001\u6848\u4f8b\u4e0e\u4ea4\u4ed8\u7ecf\u9a8c\uff0c\u6309\u9879\u76ee\u79ef\u7d2f\u4e0e\u590d\u7528"}
                </p>
              </div>
              <Button variant="ghost" onClick={() => go()}>
                {"\u67e5\u770b\u5168\u90e8"}
                <Icon name="arrow-right" size="sm" />
              </Button>
            </div>
            {state === "loading" ? (
              <p role="status">
                {"\u6b63\u5728\u8bfb\u53d6\u8d44\u6599\u2026"}
              </p>
            ) : state === "failed" ? (
              <p>
                {
                  "\u8d44\u6599\u6682\u65f6\u65e0\u6cd5\u8bfb\u53d6\uff0c\u53ef\u8fdb\u5165\u76ee\u5f55\u91cd\u8bd5\u3002"
                }
              </p>
            ) : !rows.length ? (
              <div className="jadera-resource-empty">
                <Icon name={templates ? "file-text" : "book-open"} size="lg" />
                <p>
                  {templates
                    ? "\u5bfc\u5165\u5e38\u7528\u5546\u52a1\u3001\u6280\u672f\u6216\u5de5\u7a0b\u6807\u4e66\u6a21\u677f\uff0c\u5728\u8fd9\u91cc\u67e5\u770b\u8fd1\u671f\u79ef\u7d2f\u3002\u539f\u6709\u9879\u76ee\u6a21\u677f\u7ee7\u7eed\u4fdd\u7559\u3002"
                    : "\u5bfc\u5165\u4f01\u4e1a\u8d44\u8d28\u3001\u4eba\u5458\u548c\u9879\u76ee\u6848\u4f8b\u540e\uff0c\u5728\u8fd9\u91cc\u67e5\u770b\u8fd1\u671f\u79ef\u7d2f\u3002"}
                </p>
              </div>
            ) : (
              <div className="jadera-resource-grid">
                {rows.map((item) => (
                  <ResourceVisualCard
                    key={item.id}
                    title={resourceTitle(item)}
                    category={
                      resourceCategoryLabel(item)
                    }
                    version={item.versions.at(-1)?.version}
                    updatedAt={item.updatedAt}
                    onDetails={() => go(item.resourceNumber || item.id)}
                    onOpenFile={() => { const version = item.versions.at(-1)?.version; if (version !== undefined) onOpenFile(item.resourceNumber || item.id, version, templates); }}
                    actions={<ResourceActionsMenu title={resourceTitle(item)} onEdit={() => go(item.resourceNumber || item.id, "edit")} onUpload={() => go(item.resourceNumber || item.id, "upload")} onVersions={() => go(item.resourceNumber || item.id, "versions")} onReferences={() => go(item.resourceNumber || item.id, "references")} onDownload={item.versions.length ? () => void download(item) : undefined}/>}
                    preview={<ResourcePreview item={item} tenantLabel={tenantLabel} />}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
