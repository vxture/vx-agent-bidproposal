import { runosInvoke, RunosError, type CallToolOptions, type RunosClientConfig, type RunosContract, type RunosResult } from "./client";

/** Product cloud execution only. Desktop local tools use RUYIN's Tool Gate.
 * A resolved alias is pinned before invocation; ambiguous calls are never
 * retried here, even when an operation is advertised as idempotent.
 */
export async function invokeResolvedRunosOperation(
  cfg: RunosClientConfig,
  request: { capabilityId: string; contract: RunosContract; operation: string; arguments: Record<string, unknown> },
  opts: CallToolOptions,
): Promise<RunosResult<Record<string, unknown>>> {
  const resolved = request.contract;
  if (resolved.capability_id !== request.capabilityId || !resolved.version || ["stable", "latest"].includes(resolved.version)) {
    throw new RunosError(400, "operation requires the matching, concrete resolved capability version");
  }
  const operation = resolved.contract?.operations?.find(op => op.operation === request.operation);
  if (!operation) throw new RunosError(400, "operation is absent from the resolved capability contract");
  if (operation.interactionMode && operation.interactionMode !== "sync") {
    throw new RunosError(400, "this consumer supports synchronous operations only");
  }
  const result = await runosInvoke(cfg, request.capabilityId, request.operation, request.arguments, { ...opts, version: resolved.version });
  if (result.ok && result.meta?.version_resolved && result.meta.version_resolved !== resolved.version) {
    throw new RunosError(502, "invocation returned another capability version; result refused, do not blindly retry");
  }
  return result;
}
