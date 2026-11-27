/**
 * @package @bidproposal/app
 * @layer Application
 * @category RuntimeIdentity
 * @author AI-Generated
 * @date 2026-11-25
 */
import { createHash } from "node:crypto";
import { getOidcConfig } from "../auth/lib/config";
import { getAuthContext } from "../auth/lib/session";
import { resolveDisplayProfile } from "../auth/lib/profile";
import {
  resolveCapabilityCaller,
  isRefusal,
  type CapabilityCaller,
} from "../capability/caller";
import {
  readProductEntitlement,
  checkProductAssignment,
} from "../capability/access";
import { hasDataAccess, type Entitlement } from "../entitlement/types";
import { workbenchCoverage } from "./coverage-cache";

export class WorkbenchError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export interface Principal {
  displayName?: string;
  avatarSrc?: string;
  sessionId: string;
  sub: string;
  orgId: string;
  workspaceId: string;
}
export interface WorkbenchAccess {
  principal: Principal;
  caller: CapabilityCaller;
  entitlement: Entitlement;
}

// --- Verified scope -------------------------------------------------------
export function namespaceFor(
  principal: Pick<Principal, "orgId" | "workspaceId">,
): string {
  if (!principal.orgId || !principal.workspaceId)
    throw new WorkbenchError(
      403,
      "SCOPE_REQUIRED",
      "Select an organization and workspace",
    );
  return createHash("sha256")
    .update(JSON.stringify([principal.orgId, principal.workspaceId]))
    .digest("hex");
}
export function samePrincipal(a: Principal, b: Principal): boolean {
  return (
    a.sub === b.sub && a.orgId === b.orgId && a.workspaceId === b.workspaceId
  );
}
function sessionFrom(headers: Headers): string {
  const name = getOidcConfig().cookieName;
  const values = (headers.get("cookie") ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter((v) => v.startsWith(name + "="));
  if (values.length !== 1)
    throw new WorkbenchError(401, "AUTH_REQUIRED", "Sign in to Bid again");
  try {
    const value = decodeURIComponent(values[0]!.slice(name.length + 1));
    if (!value || value.length > 512 || /[\s,;]/.test(value)) throw Error();
    return value;
  } catch {
    throw new WorkbenchError(401, "AUTH_REQUIRED", "Sign in to Bid again");
  }
}
async function coverage(caller: CapabilityCaller): Promise<Entitlement> {
  const entitlement = await readProductEntitlement(caller);
  if ("error" in entitlement)
    throw new WorkbenchError(
      entitlement.status,
      entitlement.code ?? "ENTITLEMENT_UNAVAILABLE",
      entitlement.error,
    );
  if (!hasDataAccess(entitlement))
    throw new WorkbenchError(
      403,
      "NOT_ENTITLED",
      "This workspace has no Bid access",
    );
  const assignment = await checkProductAssignment(caller);
  if (assignment)
    throw new WorkbenchError(
      assignment.status,
      assignment.code ?? "ASSIGNMENT_UNAVAILABLE",
      assignment.error,
    );
  return entitlement;
}
/** Browser runtime accepts only its own opaque product cookie. */
export async function authorizeWorkbench(
  headers: Headers,
  method: string,
): Promise<WorkbenchAccess> {
  if (headers.has("authorization"))
    throw new WorkbenchError(
      401,
      "PRODUCT_SESSION_REQUIRED",
      "Use the Bid product session",
    );
  const sessionId = sessionFrom(headers);
  const caller = await resolveCapabilityCaller(headers, { method });
  if (isRefusal(caller))
    throw new WorkbenchError(
      caller.status,
      caller.code ?? "AUTH_REQUIRED",
      caller.error,
    );
  if (!caller.sub || !caller.orgId)
    throw new WorkbenchError(
      403,
      "SCOPE_REQUIRED",
      "Select an organization and workspace",
    );
  let displayName: string | undefined;
  let avatarSrc: string | undefined;
  if (method === "POST" || method === "PATCH") {
    const cfg = getOidcConfig();
    const context = await getAuthContext(cfg, sessionId);
    if (!context || context.user.sub !== caller.sub)
      throw new WorkbenchError(401, "AUTH_REQUIRED", "Sign in again");
    const profile = await resolveDisplayProfile(cfg, sessionId, context);
    avatarSrc = profile.picture || undefined;
    displayName = profile.displayName || profile.account || undefined;
  }
  const principal = {
    sessionId,
    sub: caller.sub,
    orgId: caller.orgId,
    workspaceId: caller.workspaceId,
    ...(displayName ? { displayName } : {}),
    ...(avatarSrc ? { avatarSrc } : {}),
  };
  return {
    principal,
    caller,
    entitlement: await workbenchCoverage.read(caller, () => coverage(caller)),
  };
}
/** Refresh only the task's original RP session; never substitute a later visitor. */
export async function authorizePinnedAccess(
  pinned: Principal,
  ports: { session?: typeof getAuthContext; coverage?: typeof coverage } = {},
): Promise<WorkbenchAccess> {
  const cfg = getOidcConfig();
  const context = await (ports.session ?? getAuthContext)(
    cfg,
    pinned.sessionId,
  );
  if (!context)
    throw new WorkbenchError(
      401,
      "AUTH_REQUIRED",
      "The task's Bid session expired; sign in and retry explicitly",
    );
  const current = {
    sessionId: pinned.sessionId,
    sub: context.user.sub,
    orgId: context.user.activeOrg ?? "",
    workspaceId: context.user.activeWorkspace ?? "",
  };
  if (
    !samePrincipal(pinned, current) ||
    (context.user.accountStatus && context.user.accountStatus !== "active")
  )
    throw new WorkbenchError(
      403,
      "SCOPE_CHANGED",
      "The original task scope is no longer available",
    );
  const caller = {
    sub: current.sub,
    orgId: current.orgId,
    workspaceId: current.workspaceId,
    mint: { subjectToken: context.accessToken },
  };
  const entitlement = await (ports.coverage ?? coverage)(caller);
  return { principal: pinned, caller, entitlement };
}

/** Keep inference and storage on the same original-session authorization path. */
export async function authorizeExecution(
  pinned: Principal,
  ports: Parameters<typeof authorizePinnedAccess>[1] = {},
): Promise<CapabilityCaller> {
  return (await authorizePinnedAccess(pinned, ports)).caller;
}
