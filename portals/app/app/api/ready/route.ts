/**
 * route.ts - Standard readiness, separate from dependency-free liveness.
 * @package @bidproposal/app
 * @layer Application
 * @category router
 * @author AI-Generated
 * @date 2026-11-24
 */
import { serviceIdentity } from "@vxture/shared";
import { BRAND } from "@bidproposal/shared/brand";
import { readinessChecks } from "../../lib/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
let pending: ReturnType<typeof readinessChecks> | undefined;

/**
 * Return current dependency readiness with the shared build provenance.
 * @returns HTTP 200 when ready, otherwise 503; no private diagnostic fields.
 */
export async function GET(): Promise<Response> {
  // Coalesce overlapping probes without keeping a stale success after an outage.
  pending ??= readinessChecks().finally(() => { pending = undefined; });
  const checks = await pending;
  const ready = Object.values(checks).every((value) => value === "ok");
  return Response.json({
    ...serviceIdentity({ service: `${BRAND.productCode}-app`, product: BRAND.productCode }),
    status: ready ? "ready" : "fail", checks,
  }, { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } });
}
