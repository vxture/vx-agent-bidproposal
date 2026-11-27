import { authorizeWorkbench, WorkbenchError } from "../../../workbench-server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ operation: string }> };
/** The shared Office session contract is pending platform issue #756. */
async function route(request: Request, context: Context) {
  try {
    await authorizeWorkbench(request.headers, request.method);
    if ((await context.params).operation !== "session" || request.method !== "POST")
      return Response.json({ code: "NOT_FOUND", message: "Document endpoint unavailable" }, { status: 404 });
    return Response.json({ code: "OFFICE_SERVICE_PENDING", message: "\u6587\u6863\u5728\u7ebf\u67e5\u9605\u670d\u52a1\u5c1a\u672a\u5c31\u7eea\uff0c\u53ef\u4e0b\u8f7d\u539f\u4ef6\u3002" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof WorkbenchError ? error.status : 503;
    return Response.json({ code: error instanceof WorkbenchError ? error.code : "OFFICE_UNAVAILABLE", message: "Document request refused" }, { status, headers: { "cache-control": "no-store" } });
  }
}
export { route as GET, route as POST };
