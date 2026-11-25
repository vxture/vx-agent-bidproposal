"use client";
import { useEffect, useState } from "react";
import { Button, Icon } from "@vxture/design-system";
import { ResourceVisualCard } from "@bidproposal/shared/presentation";
import type { LibraryResource } from "@vxture/ruyin-workbench-ui/api";

const categories: Record<string, string> = {
  qualification: "\u4f01\u4e1a\u8d44\u8d28",
  staff: "\u4eba\u5458\u8d44\u6599",
  product: "\u4f01\u4e1a\u4ea7\u54c1",
  solution: "\u65b9\u6848\u8d44\u6599",
  case: "\u9879\u76ee\u6848\u4f8b",
};
/** The existing encrypted library supplies metadata; no example resources enter production. */
export function ResourceProgress({
  onKnowledge,
  onTemplates,
}: {
  onKnowledge: () => void;
  onTemplates: () => void;
}) {
  const [items, setItems] = useState<LibraryResource[]>([]),
    [state, setState] = useState("loading");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/workbench/library", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw Error("Library unavailable");
        const value = await response.json();
        if (!Array.isArray(value.items)) throw Error("Invalid library");
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
      <section>
        <div className="jadera-section-heading">
          <div>
            <h2>{"\u77e5\u8bc6\u6c89\u6dc0"}</h2>
            <p>
              {
                "\u8d44\u8d28\u3001\u6848\u4f8b\u4e0e\u4ea4\u4ed8\u7ecf\u9a8c\uff0c\u6309\u9879\u76ee\u79ef\u7d2f\u4e0e\u590d\u7528"
              }
            </p>
          </div>
          <Button variant="ghost" onClick={onKnowledge}>
            {"\u67e5\u770b\u5168\u90e8"}
            <Icon name="arrow-right" size="sm" />
          </Button>
        </div>
        {state === "loading" ? (
          <p role="status">
            {"\u6b63\u5728\u8bfb\u53d6\u77e5\u8bc6\u8d44\u6599\u2026"}
          </p>
        ) : state === "failed" ? (
          <p>
            {
              "\u8d44\u6599\u6682\u65f6\u65e0\u6cd5\u8bfb\u53d6\uff0c\u53ef\u8fdb\u5165\u77e5\u8bc6\u8d44\u6599\u91cd\u8bd5\u3002"
            }
          </p>
        ) : !items.length ? (
          <div className="jadera-resource-empty">
            <Icon name="book-open" size="lg" />
            <p>
              {
                "\u8fd8\u6ca1\u6709\u77e5\u8bc6\u8d44\u6599\u3002\u5bfc\u5165\u4f01\u4e1a\u8d44\u8d28\u3001\u4eba\u5458\u548c\u9879\u76ee\u6848\u4f8b\u540e\uff0c\u5728\u8fd9\u91cc\u67e5\u770b\u8fd1\u671f\u79ef\u7d2f\u3002"
              }
            </p>
          </div>
        ) : (
          <div className="jadera-resource-grid">
            {[...items]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 6)
              .map((item) => {
                const latest = item.versions.at(-1);
                return (
                  <ResourceVisualCard
                    key={item.id}
                    title={item.name}
                    category={
                      categories[item.category] || "\u77e5\u8bc6\u8d44\u6599"
                    }
                    version={latest?.version}
                    updatedAt={item.updatedAt}
                    onOpen={onKnowledge}
                  />
                );
              })}
          </div>
        )}
      </section>
      <section>
        <div className="jadera-section-heading">
          <div>
            <h2>{"\u6a21\u677f\u7ba1\u7406"}</h2>
            <p>
              {
                "\u6309\u6807\u4e66\u7c7b\u578b\uff0c\u9009\u7528\u5408\u9002\u7684\u5185\u5bb9\u4e0e\u7248\u5f0f"
              }
            </p>
          </div>
          <Button variant="ghost" onClick={onTemplates}>
            {"\u67e5\u770b\u5168\u90e8"}
            <Icon name="arrow-right" size="sm" />
          </Button>
        </div>
        <div className="jadera-resource-empty">
          <Icon name="file-text" size="lg" />
          <p>
            {
              "\u73b0\u6709\u6392\u7248\u6a21\u677f\u4fdd\u7559\u5728\u5404\u81ea\u6807\u4e66\u9879\u76ee\u4e2d\uff0c\u53ef\u5728\u7f16\u5199\u89c4\u5212\u548c\u6210\u679c\u5bfc\u51fa\u65f6\u67e5\u770b\u4e0e\u9009\u7528\u3002"
            }
          </p>
        </div>
      </section>
    </div>
  );
}
