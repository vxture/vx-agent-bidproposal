"use client";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ContentWidthContainer,
  Button,
  Icon,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  NativeSelect,
  ViewModeSwitch,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  EmptyState,
  Label,
} from "@vxture/design-system";
import { ResourceVisualCard } from "./resource-card";
import {
  RESOURCE_CATEGORIES,
  isTemplate,
  resourceState,
  type ResourceData,
} from "../resources";

/** Scoped access supplied by the Web or native host. */
export interface ResourceRequestOptions {
  method?: "GET" | "POST";
  body?: string;
  signal?: AbortSignal;
}
export type ResourceRequest = (path?: string, options?: ResourceRequestOptions) => Promise<any>;
export interface ResourceCollectionProps {
  templates: boolean;
  selectedId?: string;
  onSelect: (id?: string) => void;
  request: ResourceRequest;
  projects?: { id: string; name: string; archivedAt?: string }[];
  loadCompilations?: (
    id: string,
  ) => Promise<import("../compilations").CompilationList>;
  onUse?: (
    resource: ResourceData,
    version: number,
    projectId: string,
  ) => Promise<void>;
}

const categoryName = (value: string) =>
  RESOURCE_CATEGORIES[value as keyof typeof RESOURCE_CATEGORIES] ||
  "\u77e5\u8bc6\u8d44\u6599";
export function ResourceCollection({
  templates,
  selectedId,
  onSelect,
  request,
  projects = [],
  onUse,
  loadCompilations,
}: ResourceCollectionProps) {
  const [items, setItems] = useState<ResourceData[]>([]),
    [state, setState] = useState("loading"),
    [error, setError] = useState("");
  const [mode, setMode] = useState<"cards" | "list">("cards"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false),
    [target, setTarget] = useState<ResourceData>(),
    [intake, setIntake] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(
    templates ? "template_business" : "qualification",
  );
  const [version, setVersion] = useState(0),
    [unit, setUnit] = useState(0),
    [text, setText] = useState<string>(),
    [sourceState, setSourceState] = useState("loading");
  const file = useRef<HTMLInputElement>(null);
  const [using, setUsing] = useState(false),
    [useProject, setUseProject] = useState(""),
    [notice, setNotice] = useState("");
  const [useVersion, setUseVersion] = useState(""),
    [useVersions, setUseVersions] = useState<
      { id: string; label: string; state: string }[]
    >([]),
    [versionsFailed, setVersionsFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUseVersions([]);
    setUseVersion("");
    setVersionsFailed(false);
    if (useProject && loadCompilations)
      void loadCompilations(useProject)
        .then((list) => {
          if (!active) return;
          setUseVersions(list.items);
          setUseVersion(list.rootId);
        })
        .catch(() => {
          if (active) setVersionsFailed(true);
        });
    return () => {
      active = false;
    };
  }, [useProject, loadCompilations]);
  const load = useCallback(async () => {
    try {
      const value = await request();
      setItems(value.items);
      setState("ready");
    } catch (e) {
      setState("failed");
      setError(
        e instanceof Error ? e.message : "\u8d44\u6599\u65e0\u6cd5\u8bfb\u53d6",
      );
    }
  }, [request]);
  useEffect(() => {
    setCategory("");
    setQuery("");
    setUploadCategory(templates ? "template_business" : "qualification");
    void load();
  }, [templates, load]);
  useEffect(() => {
    if (
      !items.some((item) =>
        item.versions.some((v) =>
          ["queued", "running"].includes(v.reading?.state || ""),
        ),
      )
    )
      return;
    const timer = setTimeout(() => void load(), 3000);
    return () => clearTimeout(timer);
  }, [items, load]);
  const selected = items.find((item) => item.id === selectedId),
    current =
      selected?.versions.find((row) => row.version === version) ||
      selected?.versions.at(-1);
  useEffect(() => {
    setVersion(0);
    setUnit(0);
  }, [selectedId]);
  useEffect(() => {
    if (!selected || !current?.reading?.units) {
      setText(undefined);
      return;
    }
    const controller = new AbortController();
    setSourceState("loading");
    setText(undefined);
    void request(
      "/" + selected.id + "/versions/" + current.version + "/units/" + unit,
      { signal: controller.signal },
    )
      .then((value) => {
        if (controller.signal.aborted) return;
        setText(
          value.text ||
            "\u6b64\u9875\u65e0\u53ef\u63d0\u53d6\u6587\u5b57\uff0c\u8bf7\u6838\u5bf9\u539f\u4ef6\u3002",
        );
        setSourceState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setSourceState("failed");
      });
    return () => controller.abort();
  }, [selected?.id, current?.version, current?.reading?.units, unit, request]);
  const rows = items.filter(
    (item) =>
      isTemplate(item.category) === templates &&
      (!category || item.category === category) &&
      item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const choices = Object.entries(RESOURCE_CATEGORIES).filter(
    ([key]) => isTemplate(key) === templates,
  );
  const addVersion = (item: ResourceData) => {
    setTarget(item);
    setUploadCategory(item.category);
    setIntake(true);
  };
  const upload = async (selectedFile: File) => {
    setUploading(true);
    setError("");
    try {
      if (
        selectedFile.size > 20 * 1024 * 1024 ||
        !selectedFile.size ||
        !/[.](pdf|docx|md)$/i.test(selectedFile.name)
      )
        throw Error(
          "\u8bf7\u9009\u62e9\u4e0d\u8d85\u8fc7 20 MiB \u7684 PDF\u3001DOCX \u6216 Markdown \u6587\u4ef6",
        );
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 16384)
        binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      const item = await request("", {
        method: "POST",
        body: JSON.stringify({
          name: selectedFile.name,
          category: uploadCategory,
          base64: btoa(binary),
          ...(target
            ? { id: target.id, expectedVersion: target.versions.length }
            : {}),
        }),
      });
      setIntake(false);
      setTarget(undefined);
      await load();
      onSelect(item.id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "\u8d44\u6599\u5bfc\u5165\u672a\u5b8c\u6210",
      );
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  };
  const retry = async () => {
    if (!selected || !current) return;
    try {
      await request(
        "/" + selected.id + "/versions/" + current.version + "/retry",
        { method: "POST" },
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "\u8bfb\u53d6\u672a\u5b8c\u6210",
      );
    }
  };
  return (
    <main className="jadera-home-scroll">
      <ContentWidthContainer className="jadera-home-wrap">
        <header className="jadera-collection-heading">
          <div>
            <span>{"\u516c\u5171\u8d44\u6e90"}</span>
            <h1>
              {templates
                ? "\u6a21\u677f\u7ba1\u7406"
                : "\u77e5\u8bc6\u8d44\u6599"}
            </h1>
            <p>
              {templates
                ? "\u6309\u6807\u4e66\u7c7b\u578b\u79ef\u7d2f\u5185\u5bb9\u4e0e\u7248\u5f0f\uff0c\u4fdd\u7559\u6bcf\u6b21\u66f4\u65b0\u3002"
                : "\u4f01\u4e1a\u8d44\u8d28\u3001\u9879\u76ee\u6848\u4f8b\u4e0e\u4e13\u4e1a\u7ecf\u9a8c\uff0c\u968f\u9879\u76ee\u79ef\u7d2f\u4e0e\u590d\u7528\u3002"}
            </p>
          </div>
          <Button
            onClick={() => {
              setTarget(undefined);
              setIntake(true);
            }}
          >
            <Icon name="plus" size="sm" />
            {templates
              ? "\u5bfc\u5165\u6a21\u677f"
              : "\u5bfc\u5165\u8d44\u6599"}
          </Button>
        </header>
        <div className="jadera-collection-toolbar">
          <div>
            <ViewModeSwitch
              value={mode}
              onChange={setMode}
              ariaLabel={"\u8d44\u6599\u5c55\u793a\u65b9\u5f0f"}
              labels={{
                cards: "\u5361\u7247\u89c6\u56fe",
                list: "\u5217\u8868\u89c6\u56fe",
              }}
            />
            <span>
              {rows.length}
              {" \u4efd"}
              {templates ? "\u6a21\u677f" : "\u8d44\u6599"}
            </span>
          </div>
          <div>
            <InputGroup>
              <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={"\u641c\u7d22\u8d44\u6599"}
              placeholder={
                templates
                  ? "\u641c\u7d22\u6a21\u677f"
                  : "\u641c\u7d22\u77e5\u8bc6\u8d44\u6599"
              }
            />
              <InputGroupAddon><Icon name="search" size="sm" /></InputGroupAddon>
            </InputGroup>
            <NativeSelect
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={"\u8d44\u6599\u7c7b\u578b"}
            >
              <option value="">{"\u5168\u90e8\u7c7b\u578b"}</option>
              {choices.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <Button
              variant="ghost"
              size="icon-md"
              aria-label={"\u590d\u4f4d\u7b5b\u9009"}
              title={"\u590d\u4f4d\u7b5b\u9009"}
              onClick={() => {
                setQuery("");
                setCategory("");
              }}
            >
              <ArrowsClockwise size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {state === "loading" ? (
          <p role="status">{"\u6b63\u5728\u8bfb\u53d6\u8d44\u6599\u2026"}</p>
        ) : state === "failed" ? (
          <EmptyState
            icon="warning"
            title={"\u8d44\u6599\u672a\u80fd\u52a0\u8f7d"}
            action={
              <Button variant="outline" onClick={() => void load()}>
                {"\u91cd\u65b0\u8bfb\u53d6"}
              </Button>
            }
          />
        ) : !rows.length ? (
          <EmptyState
            icon="book-open"
            title={
              query || category
                ? "\u6ca1\u6709\u5339\u914d\u7684\u8d44\u6599"
                : templates
                  ? "\u79ef\u7d2f\u7b2c\u4e00\u4efd\u6a21\u677f"
                  : "\u79ef\u7d2f\u7b2c\u4e00\u4efd\u77e5\u8bc6\u8d44\u6599"
            }
            description={
              "\u5bfc\u5165\u539f\u4ef6\u540e\u81ea\u52a8\u8bfb\u53d6\uff0c\u66f4\u65b0\u65f6\u53ef\u6dfb\u52a0\u7248\u672c\u3002"
            }
          />
        ) : mode === "cards" ? (
          <div className="jadera-resource-grid jadera-resource-collection-grid">
            {rows.map((item) => (
              <ResourceVisualCard
                key={item.id}
                title={item.name}
                category={categoryName(item.category)}
                version={item.versions.at(-1)?.version}
                updatedAt={item.updatedAt}
                status={resourceState(item)}
                onOpen={() => onSelect(item.id)}
                preview={<ResourcePreview item={item} />}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-md"
                        aria-label={
                          item.name + "\u7684\u66f4\u591a\u64cd\u4f5c"
                        }
                      >
                        <Icon name="more-vertical" size="sm" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelect(item.id)}>
                        {"\u67e5\u770b\u539f\u6587\u4e0e\u7248\u672c"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addVersion(item)}>
                        {"\u6dfb\u52a0\u65b0\u7248\u672c"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))}
          </div>
        ) : (
          <div className="jadera-project-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{"\u540d\u79f0"}</TableHead>
                  <TableHead>{"\u7c7b\u578b"}</TableHead>
                  <TableHead>{"\u72b6\u6001"}</TableHead>
                  <TableHead>{"\u7248\u672c / \u66f4\u65b0"}</TableHead>
                  <TableHead>{"\u64cd\u4f5c"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{categoryName(item.category)}</TableCell>
                    <TableCell>{resourceState(item)}</TableCell>
                    <TableCell>
                      v{item.versions.at(-1)?.version}
                      {" \u00b7"}{" "}
                      {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" onClick={() => onSelect(item.id)}>
                        {"\u67e5\u770b\u8d44\u6599"}
                      </Button>
                      <Button variant="ghost" onClick={() => addVersion(item)}>
                        {"\u65b0\u7248\u672c"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Dialog
          open={intake}
          onOpenChange={(open) => {
            if (!uploading) setIntake(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {target
                  ? "\u6dfb\u52a0\u65b0\u7248\u672c"
                  : templates
                    ? "\u5bfc\u5165\u6a21\u677f"
                    : "\u5bfc\u5165\u77e5\u8bc6\u8d44\u6599"}
              </DialogTitle>
              <DialogDescription>
                {
                  "\u539f\u4ef6\u52a0\u5bc6\u4fdd\u5b58\uff0c\u6b63\u6587\u5728\u540e\u53f0\u8bfb\u53d6\uff1b\u540c\u4e00\u8d44\u6599\u7684\u5386\u53f2\u7248\u672c\u4f1a\u4fdd\u7559\u3002"
                }
              </DialogDescription>
            </DialogHeader>
            <Label htmlFor="resource-category">
              {"\u8d44\u6599\u7c7b\u578b"}
            </Label>
            <NativeSelect
              id="resource-category"
              disabled={!!target || uploading}
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
            >
              {choices.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <Input
              ref={file}
              type="file"
              accept=".pdf,.docx,.md"
              disabled={uploading}
              aria-label={"\u9009\u62e9\u8d44\u6599\u6587\u4ef6"}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) void upload(selected);
              }}
            />
            {uploading && (
              <p role="status">
                {"\u6b63\u5728\u4e0a\u4f20\u5e76\u4fdd\u5b58\u539f\u4ef6\u2026"}
              </p>
            )}
            {error && <p role="alert">{error}</p>}
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) onSelect();
          }}
        >
          <DialogContent className="jadera-resource-detail">
            <DialogHeader>
              <DialogTitle>{selected?.name}</DialogTitle>
              <DialogDescription>
                {selected && categoryName(selected.category)}
                {" \u00b7 \u539f\u6587\u4e0e\u5386\u53f2\u7248\u672c"}
              </DialogDescription>
            </DialogHeader>
            <div className="jadera-resource-detail-toolbar">
              <NativeSelect
                aria-label={"\u8d44\u6599\u7248\u672c"}
                value={current?.version || ""}
                onChange={(e) => {
                  setVersion(Number(e.target.value));
                  setUnit(0);
                }}
              >
                {selected &&
                  [...selected.versions].reverse().map((row) => (
                    <option key={row.version} value={row.version}>
                      v{row.version}
                      {" \u00b7 "}
                      {row.name}
                    </option>
                  ))}
              </NativeSelect>
              <Button
                variant="outline"
                onClick={() => {
                  if (selected) {
                    onSelect();
                    addVersion(selected);
                  }
                }}
              >
                {"\u6dfb\u52a0\u65b0\u7248\u672c"}
              </Button>
            </div>
            {onUse && (
              <div className="jadera-resource-use">
                <NativeSelect
                  aria-label={"\u9009\u7528\u5230\u6807\u4e66\u9879\u76ee"}
                  value={useProject}
                  onChange={(e) => setUseProject(e.target.value)}
                >
                  <option value="">
                    {"\u9009\u62e9\u6807\u4e66\u9879\u76ee"}
                  </option>
                  {projects
                    .filter((project) => !project.archivedAt)
                    .map((project) => (
                      <option value={project.id} key={project.id}>
                        {project.name}
                      </option>
                    ))}
                </NativeSelect>
                {loadCompilations && useProject && (
                  <NativeSelect
                    aria-label={"\u9009\u62e9\u7f16\u5236\u7248\u672c"}
                    value={useVersion}
                    onChange={(e) => setUseVersion(e.target.value)}
                  >
                    {!useVersions.length && (
                      <option value="">
                        {versionsFailed
                          ? "\u7248\u672c\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u91cd\u9009\u9879\u76ee"
                          : "\u8bfb\u53d6\u7248\u672c\u2026"}
                      </option>
                    )}
                    {useVersions.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={item.state !== "ready"}
                      >
                        {item.label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
                <Button
                  disabled={
                    !useProject ||
                    (!!loadCompilations && !useVersion) ||
                    using ||
                    current?.reading?.state !== "completed"
                  }
                  onClick={async () => {
                    if (!selected || !current) return;
                    setUsing(true);
                    setNotice("");
                    try {
                      await onUse(
                        selected,
                        current.version,
                        loadCompilations ? useVersion : useProject,
                      );
                      setNotice(
                        "\u5df2\u56fa\u5b9a\u6b64\u7248\u672c\u5230\u9879\u76ee\uff0c\u53ef\u5728\u7f16\u5199\u89c4\u5212\u548c\u6210\u679c\u5bfc\u51fa\u4e2d\u9009\u7528\u3002",
                      );
                    } catch (e) {
                      setNotice(
                        e instanceof Error
                          ? e.message
                          : "\u9009\u7528\u672a\u5b8c\u6210",
                      );
                    } finally {
                      setUsing(false);
                    }
                  }}
                >
                  {using
                    ? "\u6b63\u5728\u9009\u7528\u2026"
                    : "\u9009\u7528\u6b64\u7248\u672c"}
                </Button>
              </div>
            )}
            {notice && <p role="status">{notice}</p>}
            <p className="text-body-small text-muted-foreground">
              {selected && resourceState(selected)}
              {" \u00b7"} {current?.reading?.units || 0}
              {" \u4e2a\u539f\u6587\u5757"}
            </p>
            {current?.reading?.state === "failed" && (
              <Button variant="outline" onClick={() => void retry()}>
                {"\u91cd\u65b0\u8bfb\u53d6"}
              </Button>
            )}
            {!!current?.reading?.units && (
              <>
                <NativeSelect
                  aria-label={"\u539f\u6587\u9875\u6216\u7ed3\u6784\u5757"}
                  value={unit}
                  onChange={(e) => setUnit(Number(e.target.value))}
                >
                  {Array.from({ length: current.reading.units }, (_, i) => (
                    <option key={i} value={i}>
                      {"\u539f\u6587\u5757 "}
                      {i + 1}
                    </option>
                  ))}
                </NativeSelect>
                <div
                  className="jadera-resource-source"
                  role="region"
                  aria-label={"\u539f\u6587\u5185\u5bb9"}
                >
                  {sourceState === "loading"
                    ? "\u6b63\u5728\u8bfb\u53d6\u539f\u6587\u2026"
                    : sourceState === "failed"
                      ? "\u539f\u6587\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u91cd\u65b0\u6253\u5f00\u3002"
                      : text}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </ContentWidthContainer>
    </main>
  );
}
export function ResourcePreview({
  item,
}: {
  item: Pick<ResourceData, "name" | "category">;
}) {
  const template = isTemplate(item.category);
  return (
    <div
      className={
        "jadera-document-art " +
        (template
          ? "template"
          : item.category === "qualification"
            ? "certificate"
            : "case")
      }
    >
      <span className="jadera-document-eyebrow">
      <Icon
        name={
          template
            ? "file-text"
            : item.category === "qualification"
              ? "certificate"
              : "buildings"
        }
        size="xs"
      />

        {template ? "JADERA" : "\u77e5\u8bc6\u8d44\u6599"}
      </span>
      <strong>
        {template
          ? categoryName(item.category)
          : item.name.replace(/[.](pdf|docx|md)$/i, "")}
      </strong>
      <span>{categoryName(item.category)}</span>
      <div className="jadera-document-lines">
        <i />
        <i />
        <i />
      </div>
      <span className="jadera-document-seal" aria-hidden>
        {"\u7ae0"}
      </span>
    </div>
  );
}
