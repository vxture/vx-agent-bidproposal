/**
 * @package @bidproposal/app
 * @layer Application
 * @category RuntimeApi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { createHash, randomBytes } from "node:crypto";
import { pendingCheckpoint, unrunnableTools } from "@vxture/ruyin-core";
import {
  renderFilename,
  attachmentDisposition,
} from "@vxture/ruyin-node-runtime";
import type { BidRuntime } from "./service";
import { WorkbenchError, type WorkbenchAccess } from "./identity";

// --- Explicit request and response boundary -------------------------------
type Body = Record<string, unknown>;
export async function jsonBody(
  request: Request,
  max = 5 * 1024 * 1024,
): Promise<Body> {
  if (!request.body) return {};
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > max) {
        await reader.cancel();
        throw new WorkbenchError(
          413,
          "INPUT_TOO_LARGE",
          "Request exceeds the size limit",
        );
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value as Body;
  } catch {
    throw new WorkbenchError(400, "INVALID_INPUT", "Expected a JSON object");
  }
}
const text = (body: Body, key: string): string => {
  const value = body[key];
  if (typeof value !== "string")
    throw new WorkbenchError(400, "INVALID_INPUT", "Missing " + key);
  return value;
};
const int = (body: Body, key: string): number => {
  const value = body[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new WorkbenchError(400, "INVALID_INPUT", "Invalid " + key);
  return value;
};
const bool = (body: Body, key: string): boolean => {
  if (typeof body[key] !== "boolean")
    throw new WorkbenchError(400, "INVALID_INPUT", "Invalid " + key);
  return body[key];
};
export function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
const missing = (): never => {
  throw new WorkbenchError(404, "NOT_FOUND", "Resource unavailable");
};
export function storageLimit(access: WorkbenchAccess): number {
  const configured = access.entitlement.limits["storage.bytes.max"];
  if (configured !== undefined)
    return Number.isSafeInteger(configured) && configured >= -1
      ? configured
      : 0;
  return {
    free: 100 * 1024 ** 2,
    starter: 1024 ** 3,
    pro: 3 * 1024 ** 3,
    business: 10 * 1024 ** 3,
    enterprise: 0,
  }[access.entitlement.tier ?? "enterprise"];
}
function paid(access: WorkbenchAccess): void {
  if (!access.entitlement.tier || access.entitlement.tier === "free")
    throw new WorkbenchError(
      403,
      "PLAN_REQUIRED",
      "This operation requires a paid plan",
    );
}

// --- Bound download tickets ----------------------------------------------
interface Ticket {
  namespace: string;
  sub: string;
  sessionHash: string;
  projectId: string;
  renderId: string;
  format: string;
  expires: number;
}
const tickets = new Map<string, Ticket>();
const sessionHash = (access: WorkbenchAccess) =>
  createHash("sha256").update(access.principal.sessionId).digest("hex");
export function issueDownload(
  service: BidRuntime,
  access: WorkbenchAccess,
  projectId: string,
  renderId: string,
  format: string,
) {
  if (!["md", "docx", "pdf"].includes(format)) return missing();
  if (format !== "md") paid(access);
  const job = service.renders.get(projectId, "bidproposal", renderId);
  if (!job) return missing();
  const file = service.renders.file(projectId, "bidproposal", renderId, format),
    token = randomBytes(32).toString("hex");
  for (const [key, ticket] of tickets)
    if (ticket.expires < Date.now()) tickets.delete(key);
  tickets.set(token, {
    namespace: access.principal.orgId + ":" + access.principal.workspaceId,
    sub: access.principal.sub,
    sessionHash: sessionHash(access),
    projectId,
    renderId,
    format,
    expires: Date.now() + 60_000,
  });
  return {
    path: "/api/workbench/downloads/" + token,
    expiresAt: Date.now() + 60_000,
    filename: renderFilename(job.title, format),
    sha256: file.sha256,
    size: file.size,
  };
}
async function download(
  service: BidRuntime,
  access: WorkbenchAccess,
  token: string,
): Promise<Response> {
  const ticket = tickets.get(token);
  if (
    !ticket ||
    ticket.expires < Date.now() ||
    ticket.namespace !==
      access.principal.orgId + ":" + access.principal.workspaceId ||
    ticket.sub !== access.principal.sub ||
    ticket.sessionHash !== sessionHash(access)
  )
    return missing();
  tickets.delete(token);
  await service.checkProject(ticket.projectId);
  if (ticket.format !== "md") paid(access);
  const job = service.renders.get(
    ticket.projectId,
    "bidproposal",
    ticket.renderId,
  )!;
  const file = service.renders.file(
    ticket.projectId,
    "bidproposal",
    ticket.renderId,
    ticket.format,
  );
  return new Response(Uint8Array.from(Buffer.from(file.base64, "base64")), {
    headers: {
      "content-type": file.mediaType,
      "content-disposition": attachmentDisposition(
        renderFilename(job.title, ticket.format),
      ),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

// --- Project and native-shared UI projection ------------------------------
export async function dispatch(
  service: BidRuntime,
  access: WorkbenchAccess,
  path: string[],
  request: Request,
): Promise<Response> {
  const method = request.method;
  if (path[0] === "downloads" && path.length === 2 && method === "GET")
    return download(service, access, path[1]!);
  const host = path[0] === "host";
  const segments = host ? path.slice(1) : path;
  if (segments[0] === "projects" && segments.length === 1) {
    if (method === "GET")
      return json({
        items: await service.runtime.listProjects(),
        elsewhere: 0,
      });
    if (method === "POST") {
      const body = await jsonBody(request);
      if (body.product !== undefined && body.product !== "bidproposal")
        return missing();
      return json(
        await service.create(text(body, "name"), access.entitlement),
        201,
      );
    }
  }
  if (segments[0] === "library")
    return library(service, access, segments.slice(1), request);
  if (segments[0] !== "projects" || !segments[1]) return missing();
  const pid = segments[1],
    rest = segments.slice(2);
  const view = await service.checkProject(
    pid,
    !["GET", "HEAD"].includes(method) && rest[0] !== "restore",
  );
  const store = service.storage.openHostStore(pid)!,
    scope = service.scope();
  if (!rest.length && method === "GET")
    return json(
      host
        ? {
            meta: view.meta,
            product: view.contract.product,
            businessState: view.businessState,
            states: view.contract.states,
            operations: view.contract.project.operations ?? ["create", "open"],
            tasks: view.contract.tasks.map((task) => ({
              ...task,
              unrunnable: unrunnableTools(task.tools ?? [], () => false),
            })),
          }
        : {
            projectId: pid,
            productId: "bidproposal",
            productVersion: view.meta.productVersion,
            name: view.meta.name,
            type: view.meta.projectType,
            businessState: view.businessState,
            transitions:
              view.contract.states.items.find(
                (s) => s.name === view.businessState,
              )?.transitions ?? [],
            pendingTransition: null,
            createdAt: view.meta.createdAt,
          },
    );

  const projectPath = rest.join("/");
  const allowed = [
    /^(?:project|grants|bindings|tool-policy|context|audit|archive|restore|export|state-request|state|files|library|library-selection|readings|jobs|tasks|renders)$/,
    /^documents\/[A-Za-z0-9_-]{1,80}$/,
    /^files\/[A-Za-z0-9_-]{1,100}$/,
    /^project\/transition$/,
    /^library-selection\/[A-Za-z0-9_-]{1,100}$/,
    /^readings\/[a-f0-9-]{36}(?:\/units\/\d{1,4})?$/,
    /^jobs\/[a-f0-9-]{36}(?:\/(?:control|context-approval))?$/,
    /^tasks\/[A-Za-z0-9_-]{1,100}(?:\/(?:result|decision|cancel))?$/,
    /^renders\/[a-f0-9-]{36}(?:\/(?:files|downloads)\/(?:md|docx|pdf))?$/,
  ].some((pattern) => pattern.test(projectPath));
  if (!allowed) return missing();
  const handler = projectHandlers[rest[0] ?? ""];
  return handler
    ? handler({
        service,
        access,
        pid,
        rest,
        request,
        method,
        view,
        store,
        scope,
        host,
      })
    : missing();
}

// --- Focused project operations ------------------------------------------
interface ProjectRequest {
  service: BidRuntime;
  access: WorkbenchAccess;
  pid: string;
  rest: string[];
  request: Request;
  method: string;
  view: Awaited<ReturnType<BidRuntime["checkProject"]>>;
  store: NonNullable<ReturnType<BidRuntime["storage"]["openHostStore"]>>;
  scope: ReturnType<BidRuntime["scope"]>;
  host: boolean;
}
const projectHandlers: Record<
  string,
  (context: ProjectRequest) => Promise<Response>
> = {
  project: projectRequest,
  grants: grantsRequest,
  bindings: bindingsRequest,
  "tool-policy": tool_policyRequest,
  context: contextRequest,
  audit: auditRequest,
  archive: archiveRequest,
  restore: restoreRequest,
  export: exportRequest,
  "state-request": state_requestRequest,
  state: stateRequest,
  documents: documentsRequest,
  files: filesRequest,
  library: libraryRequest,
  "library-selection": library_selectionRequest,
  readings: readingsRequest,
  jobs: jobsRequest,
  tasks: tasksRequest,
  renders: rendersRequest,
};
async function projectRequest(context: ProjectRequest): Promise<Response> {
  const { service, access, pid, rest, request, method, view } = context;
  if (rest.length === 1 && method === "GET")
    return dispatch(service, access, ["projects", pid], request);
  if (rest[1] === "transition" && method === "POST") {
    const body = await jsonBody(request),
      to = text(body, "to"),
      transition = view.contract.states.items
        .find((s) => s.name === view.businessState)
        ?.transitions.find((t) => t.to === to);
    if (!transition)
      throw new WorkbenchError(
        409,
        "STATE_TRANSITION_ILLEGAL",
        "This transition is unavailable",
      );
    if (transition.confirm !== "human")
      return json({
        status: "done",
        businessState: await service.runtime.transitionBusinessState(pid, to),
      });
    const key = "runtime_state_request",
      old = service.documents.get(pid, "bidproposal", key);
    if (old && JSON.parse(old.markdown).pending)
      throw new WorkbenchError(
        409,
        "TRANSITION_PENDING",
        "A transition is awaiting your confirmation",
      );
    service.documents.put(
      pid,
      "bidproposal",
      key,
      JSON.stringify({
        pending: {
          projectId: pid,
          productId: "bidproposal",
          to,
          requestedAt: new Date().toISOString(),
        },
      }),
      old?.revision ?? 0,
    );
    service.events.publish({ kind: "project", projectId: pid });
    return json({ status: "awaiting_confirmation", to }, 202);
  }
  return missing();
}

async function grantsRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, method } = context;
  if (method === "GET")
    return json({ items: await service.runtime.listGrants(pid) });
  return missing();
}

async function bindingsRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, method } = context;
  if (method === "GET")
    return json({ items: await service.runtime.listBindings(pid) });
  return missing();
}

async function tool_policyRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, method } = context;
  if (method === "GET")
    return json({ items: await service.runtime.listToolPolicy(pid) });
  return missing();
}

async function contextRequest(context: ProjectRequest): Promise<Response> {
  const { pid, rest, method } = context;
  if (method === "GET")
    return json({ projectId: pid, productId: "bidproposal", bindings: [] });
  return missing();
}

async function auditRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, method } = context;
  if (method === "GET")
    return json({ items: await service.runtime.listAuditEvents(pid) });
  return missing();
}

async function archiveRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, method } = context;
  if (method === "POST") return json(await service.runtime.archiveProject(pid));
  return missing();
}

async function restoreRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, method } = context;
  if (method === "POST") return json(await service.runtime.restoreProject(pid));
  return missing();
}

async function exportRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, method, store } = context;
  if (method === "GET") {
    const exported = await service.runtime.exportProject(pid, {
      runtimeVersion: "0.2.2",
    });
    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": attachmentDisposition("project-record.json"),
        "cache-control": "private, no-store",
      },
    });
  }
  return missing();
}

async function state_requestRequest(
  context: ProjectRequest,
): Promise<Response> {
  const { service, pid, rest, request, method } = context;
  if (rest[0] === "state-request") {
    const key = "runtime_state_request",
      old = service.documents.get(pid, "bidproposal", key),
      pending = old ? JSON.parse(old.markdown).pending : null;
    if (method === "GET") return json({ pending });
    if (method === "POST") {
      const body = await jsonBody(request),
        to = text(body, "to");
      if (!pending || pending.to !== to)
        throw new WorkbenchError(
          409,
          "REQUEST_CHANGED",
          "The requested transition changed",
        );
      const approved = bool(body, "approve");
      const businessState = approved
        ? await service.runtime.transitionBusinessState(pid, to, {
            humanConfirmed: true,
          })
        : undefined;
      service.documents.put(
        pid,
        "bidproposal",
        key,
        JSON.stringify({ pending: null }),
        old!.revision,
      );
      service.events.publish({ kind: "project", projectId: pid });
      return json({
        status: approved ? "done" : "rejected",
        ...(businessState ? { businessState } : {}),
      });
    }
  }
  return missing();
}

async function stateRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, request, method } = context;
  if (method === "POST") {
    const body = await jsonBody(request);
    return json({
      businessState: await service.runtime.transitionBusinessState(
        pid,
        text(body, "to"),
        { humanConfirmed: bool(body, "humanConfirmed") },
      ),
    });
  }
  return missing();
}

async function documentsRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, request, method } = context;
  if (rest.length === 2) {
    if (method === "GET") return json(await service.document(pid, rest[1]!));
    if (method === "PUT") {
      const body = await jsonBody(request, 8 * 1024 * 1024);
      return json(
        await service.document(pid, rest[1]!, {
          markdown: text(body, "markdown"),
          revision: int(body, "revision"),
        }),
      );
    }
  }
  return missing();
}

async function filesRequest(context: ProjectRequest): Promise<Response> {
  const { service, access, pid, rest, request, method, store } = context;
  if (rest[0] === "files") {
    if (method === "GET" && rest.length === 1)
      return json({ items: store.listFiles() });
    if (method === "POST" && rest.length === 1) {
      const body = await jsonBody(request, 29 * 1024 * 1024),
        base64 = text(body, "base64");
      if (Buffer.from(base64, "base64").toString("base64") !== base64)
        throw new WorkbenchError(
          400,
          "INVALID_FILE",
          "Invalid upload encoding",
        );
      return json(
        await service.upload(
          pid,
          text(body, "name"),
          Buffer.from(base64, "base64"),
          storageLimit(access),
        ),
        201,
      );
    }
    if (rest.length === 2) {
      const file = store.getFile(rest[1]!);
      if (!file) return missing();
      if (method === "GET")
        return new Response(
          Uint8Array.from(
            await service.storage.openFileStore(pid)!.read(file.hash),
          ),
          {
            headers: {
              "content-type": file.mediaType,
              "content-disposition": attachmentDisposition(file.name),
              "cache-control": "private, no-store",
              "x-content-type-options": "nosniff",
            },
          },
        );
      if (method === "DELETE") {
        const removed = store.removeFile(file.id);
        if (!removed.stillReferenced)
          service.storage.openFileStore(pid)!.remove(file.hash);
        return json({ removed: file.id });
      }
    }
  }
  return missing();
}

async function libraryRequest(context: ProjectRequest): Promise<Response> {
  const { service, rest, method, scope } = context;
  if (method === "GET") return json({ items: service.library.list(scope) });
  return missing();
}

async function library_selectionRequest(
  context: ProjectRequest,
): Promise<Response> {
  const { service, pid, rest, request, method, scope } = context;
  if (rest[0] === "library-selection") {
    if (method === "GET")
      return json(service.library.selections(pid, "bidproposal"));
    if (method === "POST")
      return json(
        await service.library.pin(
          service.runtime,
          scope,
          pid,
          await jsonBody(request),
        ),
      );
    if (method === "DELETE" && rest[1]) {
      const body = await jsonBody(request);
      return json(
        service.library.unpin(scope, pid, rest[1], int(body, "revision")),
      );
    }
  }
  return missing();
}

async function readingsRequest(context: ProjectRequest): Promise<Response> {
  const { service, pid, rest, request, method } = context;
  if (rest[0] === "readings") {
    if (method === "POST" && rest.length === 1)
      return json(
        await service.readings.create(
          pid,
          "bidproposal",
          await jsonBody(request),
        ),
        202,
      );
    if (method === "GET") {
      if (!rest[1])
        return json({ items: service.readings.list(pid, "bidproposal") });
      const value =
        rest[2] === "units"
          ? service.readings.unit(pid, "bidproposal", rest[1], Number(rest[3]))
          : service.readings.get(pid, "bidproposal", rest[1]);
      return value ? json(value) : missing();
    }
  }
  return missing();
}

async function jobsRequest(context: ProjectRequest): Promise<Response> {
  const { service, access, pid, rest, request, method, host } = context;
  if (rest[0] === "jobs") {
    if (method === "GET")
      return json(
        rest[1]
          ? (service.jobs.get(pid, "bidproposal", rest[1]) ?? missing())
          : {
              items: host
                ? await service.jobs.summaries(pid, "bidproposal")
                : service.jobs.list(pid, "bidproposal"),
            },
      );
    if (method === "POST" && !rest[1]) {
      const body = await jsonBody(request);
      return json(
        await service.startJob(
          pid,
          { ...body, id: text(body, "id") },
          access.principal,
        ),
        202,
      );
    }
    if (method === "POST" && rest[1]) {
      const body = await jsonBody(request);
      if (
        rest[2] === "context-approval" ||
        (rest[2] === "control" &&
          ["retry", "resume"].includes(String(body.action)))
      )
        service.reauthorizeJob(pid, rest[1], access.principal);
      return json(
        rest[2] === "context-approval"
          ? await service.jobs.approveContext(
              pid,
              "bidproposal",
              rest[1],
              body.requestHash,
            )
          : rest[2] === "control"
            ? await service.jobs.control(
                pid,
                "bidproposal",
                rest[1],
                body.action,
              )
            : missing(),
      );
    }
  }
  return missing();
}

async function tasksRequest(context: ProjectRequest): Promise<Response> {
  const { service, access, pid, rest, request, method, host } = context;
  if (rest[0] === "tasks") {
    if (method === "GET") {
      const tasks = await service.runtime.listTaskInstances(pid);
      if (rest[1]) {
        const task = tasks.find((t) => t.id === rest[1]);
        if (!task) return missing();
        if (rest[2] === "result" && !task.result)
          throw new WorkbenchError(
            409,
            "RESULT_NOT_READY",
            "Review the task before its result is available",
          );
        return json(
          rest[2] === "result"
            ? {
                taskInstanceId: task.id,
                taskId: task.taskId,
                content: task.result!.content,
                sources: task.result!.sources,
                provenance: task.result!.provenance,
                verification: task.verification.map((v) => ({
                  id: v.id,
                  kind: v.kind,
                  status: v.status,
                })),
              }
            : task,
        );
      }
      return json({
        items: host
          ? tasks
          : tasks.map((t) => ({
              id: t.id,
              taskId: t.taskId,
              state: t.state,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              waitingOn: t.checkpoints
                .filter((c) => !c.decision)
                .map((c) => ({ kind: c.kind, raisedAt: c.raisedAt })),
              hasResult: !!t.result,
            })),
      });
    }
    if (method === "POST") {
      const body = await jsonBody(request),
        harness = await service.runtime.createHarness(pid);
      if (!rest[1]) {
        if (body.inputs !== undefined)
          throw new WorkbenchError(
            400,
            "INPUTS_NOT_ACCEPTED",
            "Task input is selected from the declared project documents",
          );
        const taskId = text(body, host ? "task" : "taskId");
        if (service.jobs.owns(pid, "bidproposal", taskId))
          throw new WorkbenchError(
            409,
            "TASK_BUSY",
            "A background job owns this input",
          );
        const task = await harness.startTask(taskId);
        service.tasks.start(pid, task.id);
        return json(task, 202);
      }
      if (rest[2] === "cancel")
        return json(await service.tasks.cancel(pid, rest[1]), 202);
      if (rest[2] === "decision") {
        const task = (await service.runtime.listTaskInstances(pid)).find(
          (t) => t.id === rest[1],
        );
        if (!task || !pendingCheckpoint(task))
          throw new WorkbenchError(
            409,
            "CHECKPOINT_CHANGED",
            "The confirmation is no longer pending",
          );
        service.reauthorizeTask(pid, task.id, access.principal);
        const decided = await harness.decideCheckpoint(
          task.id,
          bool(body, "approve"),
        );
        service.tasks.start(pid, decided.id);
        return json(decided, 202);
      }
    }
  }
  return missing();
}

async function rendersRequest(context: ProjectRequest): Promise<Response> {
  const { service, access, pid, rest, request, method } = context;
  if (rest[0] === "renders") {
    if (method === "POST" && !rest[1]) {
      paid(access);
      const body = await jsonBody(request);
      return json(
        await service.createRender(
          pid,
          { ...body, id: text(body, "id") },
          storageLimit(access),
        ),
        202,
      );
    }
    if (method === "GET") {
      if (!rest[1])
        return json({ items: service.renders.list(pid, "bidproposal") });
      const job = service.renders.get(pid, "bidproposal", rest[1]);
      if (!job) return missing();
      if (rest[2] === "files") {
        if (rest[3] !== "md") paid(access);
        return json(
          service.renders.file(pid, "bidproposal", rest[1], rest[3]!),
        );
      }
      return json(job);
    }
    if (method === "POST" && rest[1] && rest[2] === "downloads" && rest[3])
      return json(issueDownload(service, access, pid, rest[1], rest[3]));
  }
  return missing();
}

// --- Shared product library ----------------------------------------------
async function library(
  service: BidRuntime,
  access: WorkbenchAccess,
  path: string[],
  request: Request,
): Promise<Response> {
  const scope = service.scope(),
    method = request.method;
  if (!path.length && method === "GET")
    return json({ items: service.library.list(scope) });
  if (!path.length && method === "POST") {
    const body = await jsonBody(request, 29 * 1024 * 1024),
      bytes = Buffer.from(text(body, "base64"), "base64");
    if (
      bytes.toString("base64") !== body.base64 ||
      bytes.length > 20 * 1024 * 1024
    )
      throw new WorkbenchError(
        400,
        "INVALID_FILE",
        "Invalid upload encoding or size",
      );
    return json(
      await service.storageMutation(bytes, storageLimit(access), () =>
        service.library.import(scope, body),
      ),
      201,
    );
  }
  if (path[0] && method === "GET" && path.length === 1)
    return json(service.library.get(scope, path[0]) ?? missing());
  if (path[0] && path[1] === "versions" && path[2]) {
    if (path[3] === "units" && method === "GET")
      return json(
        service.library.unit(
          scope,
          path[0],
          Number(path[2]),
          Number(path[4]),
        ) ?? missing(),
      );
    if (path[3] === "retry" && method === "POST")
      return json(await service.library.retry(scope, path[0], Number(path[2])));
  }
  return missing();
}
