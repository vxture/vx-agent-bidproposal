"use client";
/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Workbench
 * @author AI-Generated
 * @date 2026-11-25
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  ShellHeader,
  ShellIconButton,
  ShellViewport,
  ShellPageContainer,
} from "@vxture/design-system";
import {
  Api,
  ProductHome,
  ProjectWorkflowNav,
  ProjectPanel,
  ProjectFilesSection,
  LocaleProvider,
  PRODUCT_REVIEW_EVENT,
  productNavigation,
} from "@vxture/ruyin-workbench-ui";
import type { ProductInfo, ProjectMeta } from "@vxture/ruyin-workbench-ui/api";
import type { ProductNavItem } from "@vxture/ruyin-workbench-ui/product-navigation";
import type { TabId } from "@vxture/ruyin-workbench-ui/workspace-tabs";
import { readAccess } from "../access/access-reader";
import { isThrough, type AccessState } from "../access/types";
import { EntryShell } from "../access/entry-shell";
import { EntryCard } from "../access/entry-card";
import { entryKindFor, gateLoginUrl } from "../access/entry-content";
import { SessionControl } from "../session-control";
import "./workbench.css";

// --- Original presentation with explicit Web transport --------------------
const labels = [
  "\u62db\u6807\u89e3\u8bfb",
  "\u9700\u6c42\u786e\u8ba4",
  "\u7f16\u5199\u89c4\u5212",
  "\u6807\u4e66\u7f16\u5199",
  "\u5ba1\u6838\u4fee\u8ba2",
  "\u6210\u679c\u5bfc\u51fa",
];
const stages = [
  "analysis",
  "requirements",
  "planning",
  "chapters",
  "review",
  "export",
];
const initialNavigation: ProductNavItem[] = stages.map((id, index) => ({
  id,
  label: labels[index]!,
  state: "pending",
}));
const product: ProductInfo = {
  id: "bidproposal",
  name: "\u6807\u4e66\u65b9\u6848\u667a\u80fd\u4f53",
  version: "1.17.2",
  installed: true,
  state: "active",
  entitled: true,
  availability: "available",
  subscription: null,
  commercialIntent: null,
  versions: ["1.17.2"],
  managed: true,
  supply: "package",
};
const transport: typeof fetch = (input, init) => {
  if (
    typeof input !== "string" ||
    !input.startsWith("/") ||
    input.startsWith("//")
  )
    return Promise.reject(Error("Invalid project request"));
  const headers = new Headers(init?.headers);
  headers.delete("authorization");
  return fetch("/api/workbench/host" + input, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
  });
};

export function WorkbenchApplication() {
  const [access, setAccess] = useState<AccessState | null>(null),
    [failed, setFailed] = useState(false);
  const refresh = useCallback(() => {
    setFailed(false);
    void readAccess()
      .then(setAccess)
      .catch(() => setFailed(true));
  }, []);
  useEffect(refresh, [refresh]);
  if (!access || !isThrough(access)) {
    const kind = failed
      ? "access-unavailable"
      : !access
        ? "checking"
        : entryKindFor(access);
    return (
      <EntryShell>
        <EntryCard
          kind={kind}
          actionHref={kind === "signin" ? gateLoginUrl("/") : undefined}
          onAction={kind === "signin" ? undefined : refresh}
        />
      </EntryShell>
    );
  }
  return (
    <LocaleProvider>
      <Workspace access={access} />
    </LocaleProvider>
  );
}
function Workspace({ access }: { access: AccessState }) {
  const api = useMemo(() => {
    const client = new Api("", transport);
    client.selectedResourceUnit = async (pid, readingId, index) => {
      const [job, unit] = await Promise.all([
        transport("/projects/" + pid + "/readings/" + readingId),
        transport(
          "/projects/" + pid + "/readings/" + readingId + "/units/" + index,
        ),
      ]);
      if (!job.ok || !unit.ok) throw Error("Selected source unavailable");
      const meta = await job.json(),
        value = await unit.json();
      return { text: value.text as string, total: meta.units as number };
    };
    return client;
  }, []);
  const [hash, setHash] = useState("");
  const [projects, setProjects] = useState<ProjectMeta[]>([]),
    [state, setState] = useState<"loading" | "failed" | "ready">("loading");
  const [items, setItems] = useState(initialNavigation),
    [collapsed, setCollapsed] = useState(false),
    [pending, setPending] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const parts = hash.split("/"),
    projectId = parts[0] === "#ws" ? parts[1] : undefined;
  const tab: TabId =
    parts[2] === "context" ||
    parts[2] === "tasks" ||
    parts[2] === "audit" ||
    parts[2] === "overview"
      ? parts[2]
      : "product";
  const section = parts[3] && stages.includes(parts[3]) ? parts[3] : "analysis";
  const library = hash === "#library" || hash === "#library/bidproposal",
    catalog = hash === "#projects";
  const current = projects.find((p) => p.id === projectId);
  const navigate = useCallback((href: string) => {
    window.location.hash = href;
  }, []);
  const reload = useCallback(async () => {
    try {
      const response = await api.projects();
      setProjects(response.items);
      setState("ready");
    } catch {
      setState("failed");
    }
  }, [api]);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    void reload();
    return () => window.removeEventListener("hashchange", update);
  }, [reload]);
  useEffect(() => {
    setItems(initialNavigation);
  }, [projectId]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      { ns: "bid.stage", section },
      window.location.origin,
    );
  }, [section]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow
      )
        return;
      if (event.data?.ns === "bid.workflow") {
        const parsed = productNavigation(event.data.items);
        if (parsed) setItems(parsed);
      }
      if (
        event.data?.ns === "bid.review" &&
        event.data.projectId === projectId &&
        /^[A-Za-z0-9_-]{1,80}$/.test(event.data.taskInstanceId ?? "")
      )
        window.dispatchEvent(
          new CustomEvent(PRODUCT_REVIEW_EVENT, {
            detail: { projectId, taskInstanceId: event.data.taskInstanceId },
          }),
        );
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [projectId]);
  const open = async (id: string) => {
    await reload();
    navigate("#ws/" + id + "/product/analysis");
  };
  const workspace =
    access.status === "authenticated"
      ? access.user.activeWorkspaceName
      : undefined;
  const footer = (
    <div className="bid-workbench-account">
      <SessionControl />
      {projectId && (
        <Button
          variant="ghost"
          onClick={() => navigate("#ws/" + projectId + "/tasks")}
        >
          {"\u4efb\u52a1"}
          {pending > 0 ? " (" + pending + ")" : ""}
        </Button>
      )}
    </div>
  );
  const iframe = projectId ? (
    <iframe
      ref={frame}
      title={product.name}
      className="bid-workbench-frame"
      src={"/workbench/index.html?project=" + encodeURIComponent(projectId)}
      sandbox="allow-scripts allow-same-origin allow-downloads"
      onLoad={() =>
        frame.current?.contentWindow?.postMessage(
          { ns: "bid.stage", section },
          window.location.origin,
        )
      }
    />
  ) : undefined;
  const upload = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let encoded = "";
    for (let i = 0; i < bytes.length; i += 16384)
      encoded += String.fromCharCode(...bytes.subarray(i, i + 16384));
    const response = await transport("/projects/" + projectId + "/files", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: file.name, base64: btoa(encoded) }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw Error(error.message ?? "Upload failed");
    }
  };
  return (
    <div className="bid-workbench">
      <ShellViewport
        header={
          <ShellHeader
            height="sm"
            leading={
              <div className="app-ident">
                <ShellIconButton
                  icon="arrow-left"
                  label={"\u8fd4\u56de\u9879\u76ee"}
                  onClick={() => navigate("#projects")}
                />
                <span className="app-ident-product">{product.name}</span>
                {current && (
                  <>
                    <span className="app-ident-sep">{"\u00b7"}</span>
                    <span className="app-ident-doc">{current.name}</span>
                  </>
                )}
              </div>
            }
            trailing={
              <span className="text-body-sm text-muted-foreground">
                {workspace}
              </span>
            }
          />
        }
        sidebar={
          projectId ? (
            <ProjectWorkflowNav
              items={items}
              projectId={projectId}
              activeId={tab === "product" ? section : "configuration"}
              collapsed={collapsed}
              onToggle={() => setCollapsed(!collapsed)}
              onNavigate={navigate}
              footer={footer}
            />
          ) : (
            <div className="bid-workbench-home-nav">
              <nav>
                <Button variant="ghost" onClick={() => navigate("")}>
                  {"\u4ea7\u54c1\u9996\u9875"}
                </Button>
                <Button variant="ghost" onClick={() => navigate("#projects")}>
                  {"\u6807\u4e66\u9879\u76ee"}
                </Button>
                <Button variant="ghost" onClick={() => navigate("#library")}>
                  {"\u77e5\u8bc6\u8d44\u6599\u5e93"}
                </Button>
              </nav>
              {footer}
            </div>
          )
        }
        sidebarMode={collapsed && projectId ? "collapsed" : "expanded"}
      >
        <ShellPageContainer width="wide-2xl" className="workbench-page">
          {projectId ? (
            <ProjectPanel
              api={api}
              id={projectId}
              tab={tab}
              onPending={setPending}
              productView={iframe}
              contextView={
                <ProjectFilesSection
                  api={api}
                  projectId={projectId}
                  grants={[]}
                  uploadFile={upload}
                />
              }
              exportView={
                <a
                  className="bid-workbench-download"
                  href={"/api/workbench/host/projects/" + projectId + "/export"}
                  download
                >
                  {"\u4e0b\u8f7d\u9879\u76ee\u8bb0\u5f55"}
                </a>
              }
            />
          ) : library ? (
            <iframe
              className="bid-workbench-frame"
              title={"\u77e5\u8bc6\u8d44\u6599\u5e93"}
              src="/workbench/library.html?library=1"
              sandbox="allow-scripts allow-same-origin allow-downloads"
            />
          ) : (
            <ProductHome
              api={api}
              product={product}
              projects={projects}
              projectsState={state}
              catalog={catalog}
              onCatalog={() => navigate("#projects")}
              onLibrary={() => navigate("#library")}
              onOpen={(id) => void open(id)}
              onCreated={open}
              onRefresh={reload}
            />
          )}
        </ShellPageContainer>
      </ShellViewport>
    </div>
  );
}
