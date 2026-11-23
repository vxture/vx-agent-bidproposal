import { BRAND } from "@bidproposal/shared/brand";
import { parseEntitlementEnvelope } from "../entitlement/platform-client";
import { hasDataAccess, TIERS, type Entitlement } from "../entitlement/types";
import { mintS2SToken, PLATFORM_AUDIENCE, S2STokenError } from "../lib/s2s-token";
import { assertInternalTarget } from "../lib/internal-target";
import { isDeployedStage } from "../lib/deploy-stage";
import { getOidcConfig } from "../auth/lib/config";
import type { CapabilityCaller, CallerRefusal } from "./caller";

/** Read the same live product/workspace coverage for Web entry and business APIs. */
export async function readProductEntitlement(caller: CapabilityCaller): Promise<Entitlement | CallerRefusal> {
  const base = process.env.PLATFORM_API_URL;
  if (!base) return { status: 503, error: "product entitlement service is not configured", code: "ENTITLEMENT_NOT_CONFIGURED", retryable: false };
  try {
    const url = assertInternalTarget(base.replace(/\/$/, "") + "/platform/entitlements");
    url.searchParams.set("workspace_id", caller.workspaceId);
    url.searchParams.set("product", BRAND.productCode);
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${await mintS2SToken(PLATFORM_AUDIENCE, caller.mint)}`, accept: "application/json" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { status: 503, error: "product entitlement service refused the read", code: "ENTITLEMENT_UNAVAILABLE", retryable: response.status === 429 || response.status >= 500 };
    const body = await response.json() as Record<string, unknown> | null;
    if (!body || body.workspace_id !== caller.workspaceId || body.product !== BRAND.productCode ||
        (body.tier !== null && !TIERS.some((tier) => tier === body.tier)) ||
        typeof body.bundled !== "boolean") throw Error("Invalid C2 entitlement response");
    return parseEntitlementEnvelope(caller.workspaceId, BRAND.productCode, body);
  } catch (cause) {
    return { status: 503, error: "product entitlement service is temporarily unavailable", code: "ENTITLEMENT_UNAVAILABLE", retryable: cause instanceof S2STokenError ? cause.retryable : true };
  }
}

/** Workspace coverage alone does not assign a seat to a member. */
export async function checkProductAssignment(caller: CapabilityCaller): Promise<CallerRefusal | undefined> {
  const base = process.env.PLATFORM_API_URL;
  if (!base || !caller.mint.subjectToken || !caller.sub || !caller.orgId) {
    return { status: 503, error: "product assignment context is unavailable", code: "ASSIGNMENT_UNAVAILABLE", retryable: false };
  }
  try {
    const url = assertInternalTarget(base.replace(/\/$/, "") + "/platform/product-access");
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${await mintS2SToken(PLATFORM_AUDIENCE, caller.mint)}`, accept: "application/json" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { status: 503, error: "product assignment service refused the read", code: "ASSIGNMENT_UNAVAILABLE", retryable: response.status === 429 || response.status >= 500 };
    }
    const body = await response.json() as Record<string, unknown> | null;
    if (!body || body.product !== BRAND.productCode || body.subject !== caller.sub ||
        body.workspace_id !== caller.workspaceId || body.org_id !== caller.orgId || typeof body.allowed !== "boolean") {
      throw Error("Invalid product assignment response");
    }
    if (!body.allowed) {
      return { status: 403, error: "product access is not assigned to this member", code: "PRODUCT_ACCESS_NOT_ASSIGNED", retryable: false };
    }
  } catch {
    return { status: 503, error: "product assignment service is temporarily unavailable", code: "ASSIGNMENT_UNAVAILABLE", retryable: true };
  }
}

/** Authentication alone cannot spend model credits or distribute product skills. */
export async function capabilityAccess(caller: CapabilityCaller): Promise<CallerRefusal | undefined> {
  if (!isDeployedStage() && !getOidcConfig().enabled) return;
  const entitlement = await readProductEntitlement(caller);
  if ("error" in entitlement) return entitlement;
  if (!hasDataAccess(entitlement)) {
    return { status: 403, error: "this workspace has no access to the product", code: "NOT_ENTITLED", retryable: false };
  }
  return checkProductAssignment(caller);
}
