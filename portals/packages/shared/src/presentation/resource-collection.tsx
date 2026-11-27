"use client";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ContentWidthContainer,
  ViewHeader,
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
import { ResourceActionsMenu } from "./resource-actions";
import { downloadResourceFile } from "./original-file";
import { ResourceVisualCard } from "./resource-card";
import { MarkdownViewer } from "./markdown-viewer";
import { FILE_ACCEPT, FILE_UPLOAD_MAX_BYTES, fileFormat } from "../file-formats";
import { OriginalFile, type FileAccess } from "./original-file";
import { ResourcePage } from "./resource-page";
import { ResourcePreview } from "./resource-preview";
export { ResourcePreview } from "./resource-preview";
import {
  RESOURCE_CATEGORIES,
  resourceTitle,
  isTemplate,
  resourceState,
  type ResourceData,
  type ResourceDetailAction,
} from "../resources";

/** Scoped access supplied by the Web or native host. */
export interface ResourceRequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: string;
  signal?: AbortSignal;
}
export type ResourceRequest = (path?: string, options?: ResourceRequestOptions) => Promise<any>;
export interface ResourceCollectionProps {
  fileAccess?: FileAccess;
  tenantLabel?: string;
  organizationName?: string;
  workspaceName?: string;
  templates: boolean;
  selectedId?: string;
  documentVersion?: number;
  detailAction?: ResourceDetailAction;
  onOpenFile?(id: string, version: number): void;
  onCloseFile?(id: string): void;
  onOpenProject?(id: string): void;
  onSelect: (id?: string, action?: ResourceDetailAction) => void;
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
  documentVersion,
  detailAction,
  onOpenFile,
  onCloseFile,
  onOpenProject,
  onSelect,
  request,
  projects = [],
  onUse,
  loadCompilations,
  tenantLabel,
  organizationName,
  workspaceName,
  fileAccess,
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
  const [pendingFile, setPendingFile] = useState<File>();
  const [detailTab, setDetailTab] = useState<ResourceDetailAction>("info");
  const [localDocumentVersion, setLocalDocumentVersion] = useState<number>();
  const [editing, setEditing] = useState<ResourceData>();
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState("");
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
  const selected = items.find((item) => item.id === selectedId || item.resourceNumber === selectedId),
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
  useEffect(() => {
    if (!selected?.resourceNumber || selectedId !== selected.id) return;
    if (documentVersion !== undefined && onOpenFile) onOpenFile(selected.resourceNumber, documentVersion);
    else onSelect(selected.resourceNumber, detailAction);
  }, [selected?.resourceNumber, selectedId, documentVersion]);
  const rows = items.filter(
    (item) =>
      isTemplate(item.category) === templates &&
      (!category || item.category === category) &&
      item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const choices = Object.entries(RESOURCE_CATEGORIES).filter(
    ([key]) => isTemplate(key) === templates,
  );
  const showDetails = (item: ResourceData, action: ResourceDetailAction = "info") => { setLocalDocumentVersion(undefined); setDetailTab(action); onSelect(item.resourceNumber || item.id, action === "info" ? undefined : action); };
  const openFile = (item: ResourceData) => {
    setDetailTab("info");
    const version = item.versions.at(-1)?.version;if(version===undefined)return;
    if(onOpenFile)onOpenFile(item.resourceNumber || item.id,version);
    else { setLocalDocumentVersion(version);onSelect(item.resourceNumber || item.id); }
  };
  const downloadFile = async (item: ResourceData) => {
    const version = item.versions.at(-1);if(!fileAccess || !version)return;
    try { await downloadResourceFile(fileAccess,item.id,version.version,version.name); } catch { setError("\u6587\u4ef6\u4e0b\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5"); }
  };
  const resourceActions = (item: ResourceData) => <ResourceActionsMenu title={resourceTitle(item)} onEdit={() => showDetails(item,"edit")} onUpload={() => showDetails(item,"upload")} onVersions={() => showDetails(item,"versions")} onReferences={() => showDetails(item,"references")} onDownload={fileAccess && item.versions.length ? () => void downloadFile(item) : undefined}/>;
  const addVersion = (item: ResourceData) => showDetails(item,"upload");
  const upload = async (selectedFile: File) => {
    setUploading(true);
    setError("");
    try {
      if (
        selectedFile.size > FILE_UPLOAD_MAX_BYTES ||
        !selectedFile.size ||
        !fileFormat(selectedFile.name)
      )
        throw Error(
          "\u8bf7\u9009\u62e9\u4e0d\u8d85\u8fc7 20 MiB \u7684 Office\u3001PDF\u3001Markdown \u6216\u56fe\u7247",
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
            ? { id: target.id, expectedVersion: target.versions.length, revision: target.revision }
            : {}),
        }),
      });
      setIntake(false);
      setTarget(undefined);
      setPendingFile(undefined);
      await load();
      onSelect(item.resourceNumber || item.id);
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
  const editMetadata = (item: ResourceData) => {
    showDetails(item,"edit");
  };
  const saveMetadata = async () => {
    if (!editing || savingMetadata) return;
    setSavingMetadata(true); setMetadataError("");
    try {
      await request("/" + editing.id, { method: "PATCH", body: JSON.stringify({ revision: editing.revision, name: editName.trim(), category: editCategory }) });
      await load(); setEditing(undefined);
    } catch (error) { setMetadataError(error instanceof Error ? error.message : "\u4fdd\u5b58\u5931\u8d25"); }
    finally { setSavingMetadata(false); }
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
  const loadReferences = useCallback(async (id: string, signal: AbortSignal) => (await request("/" + id + "/references", { signal })).items, [request]);
  if (selected) return <ResourcePage key={selected.id} item={selected} loadReferences={loadReferences} onOpenProject={onOpenProject} initialAction={detailAction || detailTab} tenantLabel={tenantLabel} documentVersion={documentVersion ?? localDocumentVersion} onOpenFile={onOpenFile ? version => onOpenFile(selected.resourceNumber || selected.id, version) : undefined} onCloseFile={() => {setLocalDocumentVersion(undefined);onCloseFile?.(selected.resourceNumber || selected.id);}} organizationName={organizationName || tenantLabel} workspaceName={workspaceName} fileAccess={fileAccess} parsedText={text} onBack={() => { setDetailTab("info"); onSelect(); }}
    onUpdate={async (input) => { const saved = await request("/" + selected.id, { method: "PATCH", body: JSON.stringify(input) }); await load(); if (saved.resourceNumber && saved.resourceNumber !== selectedId) onSelect(saved.resourceNumber); }}
    onUpload={async (newFile) => {
      if (!newFile.size || newFile.size > FILE_UPLOAD_MAX_BYTES || !fileFormat(newFile.name)) throw Error("\u8bf7\u9009\u62e9\u652f\u6301\u7684\u6587\u4ef6\uff0c\u4e0d\u8d85\u8fc7 20 MiB");
      const bytes = new Uint8Array(await newFile.arrayBuffer()); let binary = "";
      for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      const saved = await request("", { method: "POST", body: JSON.stringify({ id: selected.id, revision: selected.revision, expectedVersion: selected.versions.length, name: newFile.name, category: selected.category, base64: btoa(binary) }) });
      await load();
      return saved.versions.at(-1).version as number;
    }} />;
  return (
    <main className="jadera-home-scroll" data-page-scroll>
      <ContentWidthContainer className="jadera-home-wrap">
        <ViewHeader className="mb-lg" icon={templates ? "file-text" : "book-open"} title={templates
                ? "\u6a21\u677f\u7ba1\u7406"
                : "\u77e5\u8bc6\u8d44\u6599"} description={templates
                ? "\u6309\u6807\u4e66\u7c7b\u578b\u79ef\u7d2f\u5185\u5bb9\u4e0e\u7248\u5f0f\uff0c\u4fdd\u7559\u6bcf\u6b21\u66f4\u65b0\u3002"
                : "\u4f01\u4e1a\u8d44\u8d28\u3001\u9879\u76ee\u6848\u4f8b\u4e0e\u4e13\u4e1a\u7ecf\u9a8c\uff0c\u968f\u9879\u76ee\u79ef\u7d2f\u4e0e\u590d\u7528\u3002"} action={<Button size="xl"
            onClick={() => {
              setTarget(undefined);
              setPendingFile(undefined);
              setError("");
              setIntake(true);
            }}
          >
            <Icon name="plus" size="sm" />
            {templates
              ? "\u5bfc\u5165\u6a21\u677f"
              : "\u5bfc\u5165\u8d44\u6599"}
          </Button>} />
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
            <InputGroup className="jadera-collection-search">
                    <InputGroupAddon align="start"><Icon name="search" size="sm" /></InputGroupAddon>
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
              className="jadera-collection-reset"
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
                title={resourceTitle(item)}
                category={categoryName(item.category)}
                version={item.versions.at(-1)?.version}
                updatedAt={item.updatedAt}
                status={resourceState(item)}
                onDetails={() => showDetails(item)}
                onOpenFile={() => openFile(item)}
                preview={<ResourcePreview item={item} tenantLabel={tenantLabel} />}
                actions={resourceActions(item)}
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
                    <TableCell><button className="jadera-resource-list-title" onClick={()=>showDetails(item)}>{resourceTitle(item)}</button></TableCell>
                    <TableCell>{categoryName(item.category)}</TableCell>
                    <TableCell>{resourceState(item)}</TableCell>
                    <TableCell>
                      v{item.versions.at(-1)?.version}
                      {" \u00b7"}{" "}
                      {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell><div className="jadera-resource-list-actions"><Button className="jadera-resource-open" variant="default" disabled={!item.versions.length} onClick={()=>openFile(item)}>{"\u6253\u5f00"}</Button>{resourceActions(item)}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {intake && <section className="jadera-resource-intake" aria-label="\u5bfc\u5165\u6587\u4ef6">
            <header>
              <h2>
                {target
                  ? "\u6dfb\u52a0\u65b0\u7248\u672c"
                  : templates
                    ? "\u5bfc\u5165\u6a21\u677f"
                    : "\u5bfc\u5165\u77e5\u8bc6\u8d44\u6599"}
              </h2>
              <p>
                {
                  "\u539f\u4ef6\u52a0\u5bc6\u4fdd\u5b58\uff0c\u6b63\u6587\u5728\u540e\u53f0\u8bfb\u53d6\uff1b\u540c\u4e00\u8d44\u6599\u7684\u5386\u53f2\u7248\u672c\u4f1a\u4fdd\u7559\u3002"
                }
              </p>
            </header>
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
              accept={FILE_ACCEPT}
              disabled={uploading}
              aria-label={"\u9009\u62e9\u8d44\u6599\u6587\u4ef6"}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) { setPendingFile(selected); setError(""); }
              }}
            />
            {target && <p className="text-body-small">{target.name}{" \u00b7 v"}{target.versions.at(-1)?.version}{" \u2192 v"}{target.versions.length + 1}</p>}
            {pendingFile && <p className="text-body-small">{pendingFile.name}{" \u00b7 "}{(pendingFile.size / 1024 / 1024).toFixed(2)} MiB</p>}
            <div className="jadera-file-tools">
              <Button disabled={!pendingFile || uploading} onClick={() => pendingFile && void upload(pendingFile)}>{uploading ? "\u4e0a\u4f20\u4e2d\u2026" : "\u786e\u8ba4\u4e0a\u4f20"}</Button>
              <Button variant="ghost" disabled={uploading} onClick={() => setIntake(false)}>{"\u53d6\u6d88"}</Button>
            </div>
            {uploading && (
              <p role="status">
                {"\u6b63\u5728\u4e0a\u4f20\u5e76\u4fdd\u5b58\u539f\u4ef6\u2026"}
              </p>
            )}
            {error && <p role="alert">{error}</p>}
        </section>}
      </ContentWidthContainer>
    </main>
  );
}
