/**
 * @package @bidproposal/app
 * @layer Application
 * @category RuntimeRoute
 * @author AI-Generated
 * @date 2026-11-25
 */
import {
  ProjectNotFoundError,
  ProjectArchivedError,
  HarnessError,
  NeedsHumanConfirmationError,
} from "@vxture/ruyin-core";
import {
  authorizeWorkbench,
  samePrincipal,
  WorkbenchError,
  type WorkbenchAccess,
} from "../../../workbench-server/identity";
import { runtimeFor } from "../../../workbench-server/host";
import { dispatch, json } from "../../../workbench-server/dispatch";
import type { BidRuntime } from "../../../workbench-server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };

// --- Authenticated API boundary ------------------------------------------
async function route(request: Request, context: Context): Promise<Response> {
  try {
    const access = await authorizeWorkbench(request.headers, request.method);
    const service = runtimeFor(access.principal),
      path = (await context.params).path ?? [];
    if (path.some((part) => !/^[A-Za-z0-9_-]{1,100}$/.test(part)))
      throw new WorkbenchError(404, "NOT_FOUND", "Resource unavailable");
    if (request.method === "GET" && path.join("/") === "host/events")
      return events(service, access, request);
    return await service.run(access, () =>
      dispatch(service, access, path, request),
    );
  } catch (error) {
    if (error instanceof WorkbenchError)
      return json(
        {
          code: error.code,
          message: error.message,
          retryable: error.status >= 500,
        },
        error.status,
      );
    if (error instanceof ProjectNotFoundError)
      return json(
        { code: "NOT_FOUND", message: "Project unavailable", retryable: false },
        404,
      );
    if (error instanceof ProjectArchivedError)
      return json(
        {
          code: "PROJECT_ARCHIVED",
          message: "Restore the project before editing",
          retryable: false,
        },
        409,
      );
    if (error instanceof NeedsHumanConfirmationError)
      return json(
        {
          code: "APPROVAL_REQUIRED",
          message: "Review the pending confirmation",
          retryable: false,
        },
        409,
      );
    if (error instanceof HarnessError)
      return json(
        { code: "TASK_REJECTED", message: error.message, retryable: false },
        409,
      );
    console.error(
      "[bid-runtime] request failed",
      error instanceof Error ? error.name : "Unknown",
    );
    return json(
      {
        code: "RUNTIME_UNAVAILABLE",
        message: "The operation could not be completed; reload and try again",
        retryable: true,
      },
      503,
    );
  }
}

// --- Scoped invalidation stream ------------------------------------------
function events(
  service: BidRuntime,
  access: WorkbenchAccess,
  request: Request,
): Response {
  const encoder = new TextEncoder();
  let stop = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false,
        checking = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        unsubscribe();
        request.signal.removeEventListener("abort", close);
        controller.close();
      };
      stop = close;
      const send = async (data?: unknown) => {
        if (closed || checking) return;
        checking = true;
        try {
          const fresh = await authorizeWorkbench(request.headers, "GET");
          if (!samePrincipal(fresh.principal, access.principal)) return close();
          if (!closed)
            controller.enqueue(
              encoder.encode(
                data
                  ? "data: " + JSON.stringify(data) + "\n\n"
                  : ": heartbeat\n\n",
              ),
            );
        } catch {
          close();
        } finally {
          checking = false;
        }
      };
      const unsubscribe = service.events.subscribe((event) => {
        if (
          event.kind === "project" ||
          event.kind === "task" ||
          event.kind === "pending"
        )
          void send(event);
      });
      const timer = setInterval(() => void send(), 25_000);
      timer.unref();
      request.signal.addEventListener("abort", close, { once: true });
      controller.enqueue(encoder.encode(": ready\n\n"));
    },
    cancel() {
      stop();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "private, no-store",
      "x-accel-buffering": "no",
    },
  });
}
export { route as GET, route as POST, route as PUT, route as DELETE };
