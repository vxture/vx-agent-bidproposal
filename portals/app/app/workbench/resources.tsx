"use client";
import { productFetch } from "./product-fetch";
import { useEffect, useState } from "react";
import { Button, Icon } from "@vxture/design-system";
import { ResourceVisualCard } from "@bidproposal/shared/presentation";
import {
  RESOURCE_CATEGORIES,
  isTemplate,
  resourceState,
  type ResourceData,
} from "@bidproposal/shared/resources";
import { ResourcePreview } from "./resource-collection";
export function ResourceProgress({
  onKnowledge,
  onTemplates,
}: {
  onKnowledge: (id?: string) => void;
  onTemplates: (id?: string) => void;
}) {
  const [items, setItems] = useState<ResourceData[]>([]),
    [state, setState] = useState("loading");
  useEffect(() => {
    const controller = new AbortController();
    void productFetch("/api/workbench/library", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const value = await r.json();
        setItems(value.items);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("failed");
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="jadera-resource-progress">
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
                    title={item.name}
                    category={
                      RESOURCE_CATEGORIES[
                        item.category as keyof typeof RESOURCE_CATEGORIES
                      ] || "\u77e5\u8bc6\u8d44\u6599"
                    }
                    version={item.versions.at(-1)?.version}
                    updatedAt={item.updatedAt}
                    status={resourceState(item)}
                    onOpen={() => go(item.id)}
                    preview={<ResourcePreview item={item} />}
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
