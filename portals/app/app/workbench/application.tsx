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
  ShellViewport,
  ShellPageContainer,
  FullscreenProvider,
} from "@vxture/design-system";
import {
  Api,
  ProjectWorkflowNav,
  ProjectPanel,
  ProjectFilesSection,
  LocaleContext,
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
import {
  ApplicationHeader,
  ProjectCollection,
  HomeCompanion,
  type ProjectCardData,
} from "@bidproposal/shared/presentation";
import { ResourceProgress } from "./resources";
import { Management, ManagementNavigation } from "./management";
import { displayNameFor } from "../auth/lib/display";
import { ProductMark } from "../access/product-mark";
import { displayFont, textFont } from "../access/fonts";
import "@bidproposal/shared/presentation.css";
import { BRAND } from "@bidproposal/shared/brand";
import { ProductIdentity } from "../access/product-identity";
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
  id: BRAND.productCode,
  name: BRAND.fullName,
  version: "1.17.4",
  installed: true,
  state: "active",
  entitled: true,
  availability: "available",
  subscription: null,
  commercialIntent: null,
  versions: ["1.17.4"],
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
          user={access && "user" in access ? access.user : undefined}
          kind={kind}
          actionHref={kind === "signin" ? gateLoginUrl("/") : undefined}
          onAction={kind === "signin" ? undefined : refresh}
        />
      </EntryShell>
    );
  }
  return (
    <LocaleContext.Provider value="zh-CN">
      <FullscreenProvider>
        <Workspace access={access} />
      </FullscreenProvider>
    </LocaleContext.Provider>
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
  const [projects, setProjects] = useState<(ProjectMeta & ProjectCardData)[]>(
      [],
    ),
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
    catalog = hash === "#projects",
    management = parts[0] === "#admin",
    adminPage = ["account", "members"].includes(parts[1] || "")
      ? parts[1]!
      : "overview";
  const [lastProject, setLastProject] = useState<string>();
  const user = "user" in access ? access.user : undefined;
  const lastKey = "jadera-last-project:" + (user?.activeWorkspace || "local");
  useEffect(() => {
    try {
      setLastProject(localStorage.getItem(lastKey) || undefined);
    } catch {}
  }, [lastKey]);
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
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    void reload();
  }, [reload, projectId]);
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
  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(lastKey + ":" + projectId, section);
    } catch {}
  }, [projectId, section, lastKey]);
  const open = async (id: string) => {
    await reload();
    setLastProject(id);
    try {
      localStorage.setItem(lastKey, id);
    } catch {}
    let resume =
      stages[
        projects.find((project) => project.id === id)?.record?.stageIndex ?? 0
      ] || "analysis";
    try {
      const saved = localStorage.getItem(lastKey + ":" + id);
      if (saved && stages.includes(saved)) resume = saved;
    } catch {}
    navigate("#ws/" + id + "/product/" + resume);
  };
  const footer = (
    <Button
      variant="ghost"
      onClick={() => navigate("#ws/" + projectId + "/tasks")}
    >
      {"\u4efb\u52a1"}
      {pending > 0 ? " (" + pending + ")" : ""}
    </Button>
  );
  const page = projectId
    ? "business"
    : library
      ? "knowledge"
      : catalog
        ? "projects"
        : management
          ? "admin"
          : hash === "#templates"
            ? "templates"
            : hash === "#help"
              ? "help"
              : "home";
  const headerNavigate = (target: string) =>
    navigate(
      (
        {
          home: "#home",
          projects: "#projects",
          knowledge: "#library",
          templates: "#templates",
          admin: "#admin",
          help: "#help",
        } as Record<string, string>
      )[target] || "#home",
    );
  const assistant = () => window.location.assign("/chat");
  const signOut = () => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/auth/logout";
    document.body.append(form);
    form.submit();
  };
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
    <div
      className={`bid-workbench ${displayFont.variable} ${textFont.variable}`}
      id="jadera-application"
    >
      <ShellViewport
        header={
          <ApplicationHeader
            brand={<ProductIdentity />}
            identity={{
              name: displayNameFor(user, "\u5f53\u524d\u8d26\u53f7"),
              organization: user?.activeOrgName || undefined,
              workspace: user?.activeWorkspaceName || undefined,
              personal: user?.activeOrgType === "personal",
            }}
            page={page}
            projectCount={projects.length}
            onNavigate={headerNavigate}
            onSignOut={signOut}
            onAssistant={assistant}
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
          ) : management ? (
            <ManagementNavigation
              page={adminPage}
              collapsed={collapsed}
              onToggle={() => setCollapsed(!collapsed)}
            />
          ) : null
        }
        sidebarMode={
          !projectId && !management
            ? "hidden"
            : collapsed
              ? "collapsed"
              : "expanded"
        }
      >
        <ShellPageContainer
          width="wide-2xl"
          className={
            projectId ? "workbench-page" : "workbench-page jadera-landing-page"
          }
        >
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
          ) : management ? (
            <Management
              access={access}
              page={adminPage}
              onNavigate={navigate}
            />
          ) : page === "templates" ? (
            <main className="jadera-static-page">
              <h1>{"\u6a21\u677f\u7ba1\u7406"}</h1>
              <p>
                {
                  "\u73b0\u6709\u6a21\u677f\u968f\u6807\u4e66\u9879\u76ee\u4fdd\u7559\u3002\u5728\u7f16\u5199\u89c4\u5212\u4e2d\u9009\u7528\u5df2\u5bfc\u5165\u6a21\u677f\uff0c\u5728\u6210\u679c\u5bfc\u51fa\u4e2d\u6838\u5bf9\u6392\u7248\u7248\u672c\u3002"
                }
              </p>
              <Button onClick={() => navigate("#projects")}>
                {"\u9009\u62e9\u6807\u4e66\u9879\u76ee"}
              </Button>
            </main>
          ) : page === "help" ? (
            <main className="jadera-static-page">
              <h1>{"\u4f7f\u7528\u5e2e\u52a9"}</h1>
              <p>
                {
                  "\u521b\u5efa\u6216\u9009\u62e9\u6807\u4e66\u9879\u76ee\u540e\uff0c\u4f9d\u6b21\u5b8c\u6210\u62db\u6807\u89e3\u8bfb\u3001\u9700\u6c42\u786e\u8ba4\u3001\u7f16\u5199\u89c4\u5212\u3001\u6807\u4e66\u7f16\u5199\u3001\u5ba1\u6838\u4fee\u8ba2\u548c\u6210\u679c\u5bfc\u51fa\u3002"
                }
              </p>
              <Button onClick={() => navigate("#projects")}>
                {"\u67e5\u770b\u6807\u4e66\u9879\u76ee"}
              </Button>
            </main>
          ) : (
            <ProjectCollection
              projects={projects}
              state={state}
              catalog={catalog}
              currentId={lastProject}
              onOpen={(id) => void open(id)}
              onCreate={async (name) => {
                const value = await api.createProject(BRAND.productCode, name);
                await open(value.id);
              }}
              onCatalog={() => navigate("#projects")}
              onReload={() => void reload()}
              onContinue={
                projects.some(
                  (project) =>
                    project.id === lastProject && !project.archivedAt,
                )
                  ? () => void open(lastProject!)
                  : undefined
              }
              brand={
                <>
                  <ProductMark size={20} />
                  <span>{BRAND.fullName}</span>
                </>
              }
              resources={
                <ResourceProgress
                  onKnowledge={() => navigate("#library")}
                  onTemplates={() => navigate("#templates")}
                />
              }
              companion={
                <HomeCompanion
                  imageSrc="/brand/jadera-companion.svg"
                  onOpen={assistant}
                />
              }
            />
          )}
          {projectId && tab !== "product" && <div hidden>{iframe}</div>}
        </ShellPageContainer>
      </ShellViewport>
    </div>
  );
}
