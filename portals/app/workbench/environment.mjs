/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Runtime
 * @author AI-Generated
 * @date 2026-11-25
 */
import { StageNavigation } from "@bidproposal/workbench/runtime";

/** A same-origin transport; the server remains authoritative for identity. */
export function createRuntime({
  href = location.href,
  fetcher = fetch,
  publish,
  review = (taskInstanceId) =>
    window.parent.postMessage(
      {
        ns: "bid.review",
        projectId: new URL(href).searchParams.get("project"),
        taskInstanceId,
      },
      location.origin,
    ),
} = {}) {
  const page = new URL(href);
  const projectId = page.searchParams.get("project");
  const libraryMode = page.searchParams.get("library") === "1";
  if (
    !libraryMode &&
    !/^(?:prj_[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(
      projectId || "",
    )
  )
    throw new Error("Invalid project");
  if (typeof publish !== "function")
    throw new Error("Workflow presentation is not attached");
  const base = new URL(
    libraryMode
      ? "/api/workbench/"
      : "/api/workbench/projects/" + projectId + "/",
    page.origin,
  );
  const navigation = new StageNavigation();
  navigation.select("analysis");
  const downloads = new Map();
  const controller = new AbortController();
  let accessBlocked = false;
  const receive = (event) => {
    if (event.source === window.parent && event.origin === page.origin && event.data?.ns === "bid.access") {
      accessBlocked = event.data.blocked === true;
      return;
    }
    if (
      event.source === window.parent &&
      event.origin === page.origin &&
      event.data?.ns === "bid.stage"
    )
      navigation.select(event.data.section);
  };
  if (typeof window !== "undefined")
    window.addEventListener("message", receive);
  return {
    async request(method, path, body) {
      if (
        !["GET", "POST", "PUT", "DELETE"].includes(method) ||
        !/^\/[a-zA-Z0-9_/-]+$/.test(path) ||
        path.includes("//")
      )
        throw new Error("Invalid runtime request");
      const target = libraryMode
        ? path.replace(/^\/items(?=\/|$)/, "/library")
        : path;
      if (accessBlocked) throw new Error("Session confirmation required; current content is retained");
      const response = await fetcher(new URL(target.slice(1), base).href, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        headers:
          body === undefined ? {} : { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if ([401, 403].includes(response.status) && typeof window !== "undefined") {
        accessBlocked = true;
        window.parent.postMessage({ ns: "bid.access-recovery" }, page.origin);
      }
      let value = await response.json();
      if (
        response.ok &&
        method === "POST" &&
        /^\/renders\/[A-Za-z0-9_-]+\/downloads\/(pdf|docx|md)$/.test(path) &&
        /^\/(?:api\/workbench\/)?downloads\/[a-f0-9]{64}$/.test(value.path)
      ) {
        // Keep the shared UI's host-relative ticket contract. Only this Web
        // adapter knows the product API prefix used by its issued URL.
        const issuedPath = value.path;
        const path = issuedPath.replace(
          /^\/api\/workbench(?=\/downloads\/)/,
          "",
        );
        downloads.set(path, issuedPath);
        value = { ...value, path };
      }
      return response.ok
        ? { ok: true, status: response.status, body: value }
        : {
            ok: false,
            status: response.status,
            error: {
              message:
                value.message || value.error?.message || "Request failed",
            },
          };
    },
    review,
    onStage: (listener) => navigation.subscribe(listener),
    navigate: (section) => navigation.select(section),
    replayNavigation: () => navigation.replay(),
    publishNavigation: publish,
    downloadUrl(path) {
      const issuedPath = downloads.get(path);
      if (!issuedPath) throw new Error("Unissued download");
      return new URL(issuedPath, page.origin).href;
    },
    close() {
      controller.abort();
      if (typeof window !== "undefined")
        window.removeEventListener("message", receive);
      navigation.close();
      downloads.clear();
    },
  };
}
