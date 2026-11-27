"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Icon,
  Input,
  Label,
  NativeSelect,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@vxture/design-system";
import type { ResourceType, ResourcePerson } from "../resources";
import type { ResourceRequest } from "./resource-collection";
import {usePageRefresh,useRefreshGuard} from "./page-refresh";
import { ResourcePersonLabel } from "./resource-person";
export function ResourceTypeSettings({
  request,
  collection,
}: {
  request: ResourceRequest;
  collection: ResourceType["collection"];
}) {
  const [data, setData] = useState<{
      items: ResourceType[];
      revision: number;
      canManage: boolean;
    }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState<ResourceType | "new">(),
    [remove, setRemove] = useState<ResourceType>(),
    [label, setLabel] = useState(""),
    [style, setStyle] = useState<ResourceType["coverStyle"]>("document");
  const load = useCallback(async () => {
    try {
      setData(await request("/types"));
      setError("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "\u914d\u7f6e\u8bfb\u53d6\u5931\u8d25",
      );
    }
  }, [request]);
  usePageRefresh(load);
  useRefreshGuard(!!editor||!!remove||busy,()=>setError("\u8bf7\u5148\u5b8c\u6210\u6216\u5173\u95ed\u7c7b\u578b\u7f16\u8f91\uff0c\u518d\u5237\u65b0\u3002"));
  useEffect(() => {
    setData(undefined);
    void load();
  }, [load, collection]);
  const execute = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "\u64cd\u4f5c\u5931\u8d25",
      );
    } finally {
      setBusy(false);
    }
  };
  const edit = (type: ResourceType | "new") => {
    setLabel(type === "new" ? "" : type.label);
    setStyle(type === "new" ? "document" : type.coverStyle);
    setError("");
    setEditor(type);
  };
  return (
    <section className="jadera-type-settings">
      <header>
        <p>
          {
            "\u7c7b\u578b\u7528\u4e8e\u7b5b\u9009\u3001\u5bfc\u5165\u548c\u8d44\u6599\u5206\u7c7b\u3002\u91cd\u547d\u540d\u4f1a\u540c\u6b65\u66f4\u65b0\u5c55\u793a\uff1b\u5df2\u88ab\u4f7f\u7528\u7684\u7c7b\u578b\u987b\u5148\u91cd\u65b0\u5206\u7c7b\uff0c\u624d\u80fd\u5220\u9664\u3002"
          }
        </p>
        <Button disabled={!data?.canManage || busy} onClick={() => edit("new")}>
          <Icon name="plus" size="sm" />
          {"\u65b0\u589e\u7c7b\u578b"}
        </Button>
      </header>
      {error && !editor && !remove && (
        <p role="alert">
          {error}
          <Button variant="ghost" onClick={() => void load()}>
            {"\u91cd\u8bd5"}
          </Button>
        </p>
      )}
      {!data ? (
        <p role="status">{"\u6b63\u5728\u8bfb\u53d6\u914d\u7f6e\u2026"}</p>
      ) : (
        <>
          <div className="jadera-settings-table">
            <table>
              <thead>
                <tr>
                  <th>{"\u7c7b\u578b\u540d\u79f0"}</th>
                  <th>{"\u5c01\u9762"}</th>
                  <th>{"\u4f7f\u7528\u6570\u91cf"}</th>
                  <th>{"\u64cd\u4f5c"}</th>
                </tr>
              </thead>
              <tbody>
                {data.items
                  .filter((type) => type.collection === collection)
                  .map((type) => (
                    <tr key={type.id}>
                      <td>{type.label}</td>
                      <td>
                        {type.coverStyle === "certificate"
                          ? "\u8bc1\u4e66"
                          : "\u6587\u6863"}
                      </td>
                      <td>{type.usage || 0}</td>
                      <td>
                        <div className="jadera-settings-row-actions">
                          <Button
                            variant="ghost"
                            disabled={!data.canManage || busy}
                            onClick={() => edit(type)}
                          >
                            {"\u7f16\u8f91"}
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={!data.canManage || busy || !!type.usage}
                            title={
                              type.usage
                                ? "\u8bf7\u5148\u8c03\u6574\u4f7f\u7528\u6b64\u7c7b\u578b\u7684\u8d44\u6599"
                                : "\u5220\u9664\u7c7b\u578b"
                            }
                            onClick={() => {
                              setError("");
                              setRemove(type);
                            }}
                          >
                            {"\u5220\u9664"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!data.items.some((type) => type.collection === collection) && (
              <p>
                {
                  "\u6682\u65e0\u7c7b\u578b\uff0c\u8bf7\u65b0\u589e\u540e\u518d\u5bfc\u5165\u8d44\u6599\u3002"
                }
              </p>
            )}
          </div>
          {!data.canManage && (
            <p className="jadera-resource-help">
              {
                "\u5f53\u524d\u4e3a\u53ea\u8bfb\u3002\u5de5\u4f5c\u533a\u7ba1\u7406\u8005\u53ef\u4ee5\u7ef4\u62a4\u7c7b\u578b\u3002"
              }
            </p>
          )}
        </>
      )}
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(undefined);
        }}
      >
        <DialogContent className="jadera-type-dialog">
          <DialogHeader>
            <DialogTitle>
              {editor === "new"
                ? "\u65b0\u589e\u7c7b\u578b"
                : "\u7f16\u8f91\u7c7b\u578b"}
            </DialogTitle>
            <DialogDescription>
              {
                "\u7c7b\u578b\u540d\u79f0\u4f1a\u5e94\u7528\u5230\u672c\u5de5\u4f5c\u533a\u6240\u6709\u76f8\u5e94\u8d44\u6599\u3002"
              }
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!data || !editor) return;
              void execute(async () => {
                const result = await request(
                  "/types" +
                    (editor === "new"
                      ? ""
                      : "/" + encodeURIComponent(editor.id)),
                  {
                    method: editor === "new" ? "POST" : "PATCH",
                    body: JSON.stringify({
                      revision: data.revision,
                      label,
                      collection,
                      coverStyle: style,
                    }),
                  },
                );
                setData(result);
                setEditor(undefined);
              });
            }}
          >
            <Label>
              {"\u7c7b\u578b\u540d\u79f0"}
              <Input
                required
                maxLength={40}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={busy}
              />
            </Label>
            {collection === "knowledge" && (
              <Label>
                {"\u5c01\u9762\u6837\u5f0f"}
                <NativeSelect
                  value={style}
                  disabled={busy}
                  onChange={(e) =>
                    setStyle(e.target.value as ResourceType["coverStyle"])
                  }
                >
                  <option value="document">{"\u666e\u901a\u6587\u6863"}</option>
                  <option value="certificate">
                    {"\u8d44\u8d28\u8bc1\u4e66"}
                  </option>
                </NativeSelect>
              </Label>
            )}
            {error && <p role="alert">{error}</p>}
            <footer>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setEditor(undefined)}
              >
                {"\u53d6\u6d88"}
              </Button>
              <Button type="submit" disabled={busy || !label.trim()}>
                {busy ? "\u4fdd\u5b58\u4e2d\u2026" : "\u4fdd\u5b58"}
              </Button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open && !busy) setRemove(undefined);
        }}
      >
        <DialogContent className="jadera-type-dialog">
          <DialogHeader>
            <DialogTitle>{"\u5220\u9664\u7c7b\u578b"}</DialogTitle>
            <DialogDescription>
              {"\u786e\u8ba4\u5220\u9664\u201c"}
              {remove?.label}
              {
                "\u201d\uff1f\u5220\u9664\u540e\u5c06\u4e0d\u518d\u51fa\u73b0\u5728\u5206\u7c7b\u9009\u9879\u4e2d\u3002"
              }
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert">{error}</p>}
          <footer>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setRemove(undefined)}
            >
              {"\u53d6\u6d88"}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void execute(async () => {
                  const result = await request(
                    "/types/" + encodeURIComponent(remove!.id),
                    {
                      method: "DELETE",
                      body: JSON.stringify({ revision: data!.revision }),
                    },
                  );
                  setData(result);
                  setRemove(undefined);
                })
              }
            >
              {busy ? "\u5220\u9664\u4e2d\u2026" : "\u786e\u8ba4\u5220\u9664"}
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function ResourceMemberDirectory({
  request,
}: {
  request: ResourceRequest;
}) {
  const [items, setItems] = useState<ResourcePerson[]>(),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  usePageRefresh(()=>setRetry(value=>value+1));
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void request("/members", { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setItems(value.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [request, retry]);
  return (
    <section>
      <p>
        {
          "\u4ec5\u663e\u793a\u672c\u5de5\u4f5c\u533a\u5df2\u4f7f\u7528\u672c\u4ea7\u54c1\u7684\u6210\u5458\uff0c\u53ef\u7528\u4e8e\u8865\u5f55\u7f3a\u5931\u7684\u8d44\u6599\u521b\u5efa\u4eba\u3002\u5b8c\u6574\u6210\u5458\u4e0e\u6743\u9650\u5728\u5de5\u4f5c\u533a\u7ba1\u7406\u4e2d\u7ef4\u62a4\u3002"
        }
      </p>
      {error ? (
        <Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>
          {"\u8bfb\u53d6\u5931\u8d25\uff0c\u91cd\u8bd5"}
        </Button>
      ) : items ? (
        <ul className="jadera-member-directory">
          {items.map((person) => (
            <li key={person.id}>
              <ResourcePersonLabel person={person} />
            </li>
          ))}
        </ul>
      ) : (
        <p role="status">{"\u8bfb\u53d6\u6210\u5458\u2026"}</p>
      )}
      <Button variant="outline" asChild>
        <a
          href="https://console.vxture.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {"\u5de5\u4f5c\u533a\u7ba1\u7406"}
          <Icon name="arrow-right" size="sm" />
        </a>
      </Button>
    </section>
  );
}
