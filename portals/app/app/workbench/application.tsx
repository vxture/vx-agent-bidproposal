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
  AssistantDock,
  WorkflowNavigation,
  CompilationSelector,
  CompilationRequirements,
  useMediaQuery,
  type ProjectCardData,
} from "@bidproposal/shared/presentation";
import { ProjectWorkspace } from "./project-workspace";
import { compilationRequest, useCompilations } from "./compilation-client";
import { requirementsComplete } from "@bidproposal/shared/compilations";
import { ResourceCollection } from "./resource-collection";
import { assistantClient } from "./assistant-client";
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
const loadCompilations = (id: string) =>
  compilationRequest<
    import("@bidproposal/shared/compilations").CompilationList
  >(id, "compilations");

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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const compactWorkflow = useMediaQuery("(max-width: 990px)");
  useEffect(() => {
    if (compactWorkflow !== undefined) setCollapsed(compactWorkflow);
  }, [compactWorkflow]);
  const frame = useRef<HTMLIFrameElement>(null);
  const parts = hash.split("/"),
    projectId = parts[0] === "#ws" ? parts[1] : undefined;
  const compilation = useCompilations(projectId);
  const versionLabel = compilation.data?.items.find(
    (item) => item.id === projectId,
  )?.label;
  const logicalProjectId = compilation.data?.rootId ?? projectId;
  const projectArchived = !!projects.find(
    (project) => project.id === logicalProjectId,
  )?.archivedAt;
  const projectName =
    compilation.data?.projectName ||
    projects.find((project) => project.id === logicalProjectId)?.name;
  const [planRefresh, setPlanRefresh] = useState(0);
  const tab: TabId =
    parts[2] === "context" ||
    parts[2] === "tasks" ||
    parts[2] === "audit" ||
    parts[2] === "overview"
      ? parts[2]
      : "product";
  const section = parts[3] && stages.includes(parts[3]) ? parts[3] : "analysis";
  const library = parts[0] === "#library" || parts[0] === "#knowledge",
    catalog = hash === "#projects",
    management = parts[0] === "#admin",
    adminPage = ["account", "members"].includes(parts[1] || "")
      ? parts[1]!
      : "overview";
  const [lastProject, setLastProject] = useState<string>();
  const user = "user" in access ? access.user : undefined;
  const lastKey =
    "jadera-last-project:" +
    [user?.sub, user?.activeOrg, user?.activeWorkspace].join(":");
  useEffect(() => {
    try {
      setLastProject(localStorage.getItem(lastKey) || undefined);
    } catch {
      // Remembering a view is optional when browser storage is unavailable.
    }
  }, [lastKey]);
  const navigate = useCallback((href: string) => {
    const doc = frame.current?.contentDocument;
    if (doc?.documentElement.dataset.unsaved === "true") {
      doc.dispatchEvent(new Event("bid.unsaved"));
      return;
    }
    window.location.hash = href;
  }, []);
  const reload = useCallback(async () => {
    try {
      const response = await api.projects();
      setProjects(
        response.items.map((raw) => {
          const project = raw as ProjectMeta &
            ProjectCardData & {
              compilationRecords?: {
                id: string;
                label: string;
                record?: ProjectCardData["record"];
              }[];
            };
          let selected = project.id;
          try {
            selected =
              localStorage.getItem(lastKey + ":version:" + project.id) ||
              project.id;
          } catch {
            /* Use the original version if view storage is unavailable. */
          }
          const version = project.compilationRecords?.find(
            (item) => item.id === selected,
          );
          return version
            ? {
                ...project,
                record: version.record,
                versionLabel: version.label,
              }
            : project;
        }),
      );
      setState("ready");
    } catch {
      setState("failed");
    }
  }, [api, lastKey]);
  useEffect(() => {
    let acceptedHash = window.location.hash;
    const update = () => {
      const doc = frame.current?.contentDocument;
      if (doc?.documentElement.dataset.unsaved === "true" && window.location.hash !== acceptedHash) {
        window.history.replaceState(null, "", acceptedHash);
        doc.dispatchEvent(new Event("bid.unsaved"));
        return;
      }
      acceptedHash = window.location.hash;
      setHash(acceptedHash);
    };
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
    if (!projectId || tab !== "product") return;
    if (!logicalProjectId) return;
    setLastProject(logicalProjectId);
    try {
      localStorage.setItem(lastKey, logicalProjectId);
      localStorage.setItem(lastKey + ":version:" + logicalProjectId, projectId);
      localStorage.setItem(lastKey + ":" + projectId, section);
    } catch {
      // Project persistence does not depend on local view preferences.
    }
  }, [projectId, logicalProjectId, tab, section, lastKey]);
  const open = async (id: string) => {
    await reload();
    setLastProject(id);
    try {
      localStorage.setItem(lastKey, id);
    } catch {
      // Continue to the project even when browser storage is unavailable.
    }
    let resume =
      stages[
        projects.find((project) => project.id === id)?.record?.stageIndex ?? 0
      ] || "analysis";
    try {
      const saved = localStorage.getItem(lastKey + ":" + id);
      if (saved && stages.includes(saved)) resume = saved;
    } catch {
      // The recorded stage remains the fallback for this project.
    }
    let selectedId = id;
    try {
      const saved = localStorage.getItem(lastKey + ":version:" + id);
      if (saved && saved !== id) {
        const versions = await compilationRequest<
          import("@bidproposal/shared/compilations").CompilationList
        >(id, "compilations");
        if (
          versions.items.some(
            (item) => item.id === saved && item.state === "ready",
          )
        )
          selectedId = saved;
      }
      const stage = localStorage.getItem(lastKey + ":" + selectedId);
      if (stage && stages.includes(stage)) resume = stage;
    } catch {
      /* The original project stays available if a saved version cannot be resolved. */
    }
    navigate("#ws/" + selectedId + "/product/" + resume);
  };
  const page = projectId
    ? "business"
    : library
      ? "knowledge"
      : catalog
        ? "projects"
        : management
          ? "admin"
          : parts[0] === "#templates"
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
  const assistant = () => setAssistantOpen((value) => !value);
  const signOut = () => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/auth/logout";
    document.body.append(form);
    form.submit();
  };
  const syncFrameTheme = () => {
    const target = frame.current?.contentDocument?.documentElement;
    if (!target) return;
    const values = getComputedStyle(document.documentElement);
    for (const token of [
      "background",
      "foreground",
      "card",
      "muted",
      "muted-foreground",
      "primary",
      "primary-text",
      "primary-foreground",
      "primary-muted",
      "border",
      "radius-md",
      "body-md-font-size",
      "title-md-font-size",
      "space-md",
      "space-lg",
      "space-2xs",
      "space-xs",
      "space-sm",
      "space-xl",
      "space-2xl",
      "space-3xl",
      "space-control-md",
      "radius-sm",
      "accent",
      "ring",
      "body-sm-font-size",
      "title-sm-font-size",
      "title-lg-font-size",
    ]) {
      target.style.setProperty(
        "--" + token,
        values.getPropertyValue("--" + token),
      );
    }
    target.classList.toggle(
      "dark",
      document.documentElement.classList.contains("dark"),
    );
  };
  useEffect(() => {
    const observer = new MutationObserver(syncFrameTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  const iframe = projectId ? (
    <iframe
      key={projectId + ":" + planRefresh}
      ref={frame}
      title={product.name}
      className="bid-workbench-frame"
      src={"/workbench/index.html?project=" + encodeURIComponent(projectId)}
      sandbox="allow-scripts allow-same-origin allow-downloads"
      onLoad={() => {
        syncFrameTheme();
        frame.current?.contentWindow?.postMessage(
          { ns: "bid.stage", section },
          window.location.origin,
        );
      }}
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
            <WorkflowNavigation
              steps={items}
              projectId={projectId}
              activeId={tab === "product" ? section : tab}
              collapsed={collapsed}
              onToggle={() => setCollapsed(!collapsed)}
              pending={pending}
              completeness={
                compilation.brief
                  ? requirementsComplete(compilation.brief.value)
                  : undefined
              }
              versionSelector={
                <CompilationSelector
                  key={projectId}
                  data={compilation.data}
                  selectedId={projectId}
                  collapsed={collapsed}
                  readOnly={projectArchived}
                  loading={compilation.loading}
                  failed={compilation.failed}
                  onReload={() => void compilation.reload()}
                  onSelect={(id) => navigate("#ws/" + id + "/product/analysis")}
                  onRetry={async (id) => {
                    const result = await compilationRequest<{
                      selectedId: string;
                    }>(projectId, "compilations", {
                      method: "POST",
                      body: JSON.stringify({ retryId: id }),
                    });
                    navigate("#ws/" + result.selectedId + "/overview");
                  }}
                  onRename={async (label) => {
                    await compilationRequest(projectId, "compilations", {
                      method: "PATCH",
                      body: JSON.stringify({
                        label,
                        revision: compilation.data?.revision,
                      }),
                    });
                    await compilation.reload();
                    await reload();
                  }}
                  onCreate={async (input) => {
                    const result = await compilationRequest<{
                      selectedId: string;
                    }>(projectId, "compilations", {
                      method: "POST",
                      body: JSON.stringify(input),
                    });
                    navigate("#ws/" + result.selectedId + "/overview");
                  }}
                />
              }
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
          <div className="jadera-work-area">
            {projectId ? (
              <ProjectWorkspace
                key={projectId}
                api={api}
                id={projectId}
                name={projectName || "\u6807\u4e66\u9879\u76ee"}
                tab={tab}
                section={section}
                iframe={iframe}
                frame={frame}
                onPending={setPending}
                onNavigate={navigate}
                upload={upload}
                assistantOpen={assistantOpen}
                onReview={() => setAssistantOpen(false)}
                versionLabel={versionLabel}
                archived={projectArchived}
                onProjectChanged={reload}
                onRename={async (projectName) => {
                  await compilationRequest(projectId, "compilations", {
                    method: "PATCH",
                    body: JSON.stringify({
                      projectName,
                      revision: compilation.data?.revision,
                    }),
                  });
                  await compilation.reload();
                  await reload();
                }}
                requirementsView={
                  <CompilationRequirements
                    key={projectId}
                    snapshot={compilation.brief}
                    loading={compilation.loading}
                    failed={compilation.failed}
                    versionLabel={versionLabel}
                    readOnly={projectArchived}
                    onReload={() => void compilation.reload()}
                    onSave={async (value, revision) => {
                      await compilation.save(value, revision);
                      setPlanRefresh((count) => count + 1);
                    }}
                  />
                }
              />
            ) : library || page === "templates" ? (
              <ResourceCollection
                loadCompilations={loadCompilations}
                templates={page === "templates"}
                projects={projects}
                onUse={async (resource, version, pid) => {
                  const selected = await transport(
                    "/projects/" + pid + "/library-selection",
                  );
                  if (!selected.ok)
                    throw Error(
                      "\u9879\u76ee\u8d44\u6599\u672a\u80fd\u8bfb\u53d6\uff0c\u8bf7\u91cd\u8bd5",
                    );
                  const snapshot = await selected.json();
                  const saved = await transport(
                    "/projects/" + pid + "/library-selection",
                    {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        id: resource.id,
                        version,
                        revision: snapshot.revision,
                      }),
                    },
                  );
                  if (!saved.ok)
                    throw Error(
                      "\u9009\u7528\u672a\u5b8c\u6210\uff0c\u8bf7\u91cd\u65b0\u8bfb\u53d6\u9879\u76ee\u540e\u91cd\u8bd5",
                    );
                }}
                selectedId={parts[1] !== "bidproposal" ? parts[1] : undefined}
                onSelect={(id) =>
                  navigate(
                    (page === "templates" ? "#templates" : "#library") +
                      (id ? "/" + id : ""),
                  )
                }
              />
            ) : management ? (
              <Management
                access={access}
                page={adminPage}
                onNavigate={navigate}
              />
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
                  const value = await api.createProject(
                    BRAND.productCode,
                    name,
                  );
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
                    onKnowledge={(id) =>
                      navigate("#library" + (id ? "/" + id : ""))
                    }
                    onTemplates={(id) =>
                      navigate("#templates" + (id ? "/" + id : ""))
                    }
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
            <AssistantDock
              open={assistantOpen}
              onClose={() => setAssistantOpen(false)}
              client={assistantClient}
              projectId={projectId}
              projectName={projectName}
            />
          </div>
        </ShellPageContainer>
      </ShellViewport>
    </div>
  );
}
