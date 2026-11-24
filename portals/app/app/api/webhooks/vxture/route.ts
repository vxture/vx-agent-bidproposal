import { BRAND } from "@bidproposal/shared/brand";
import { verifySignature, webhookSecrets } from "../../../provisioning/lib/verify";
import { handleProvisioning, type ProvisioningEvent } from "../../../provisioning/lib/handler";
import { getProvisioningStore } from "../../../provisioning/lib/store";
import { PrismaProvisioningStore } from "../../../provisioning/lib/prisma-store";
import { getEntitlementResolver } from "../../../entitlement/resolver";
import { isDeployedStage } from "../../../lib/deploy-stage";
import { getPrismaClient, prismaEnabled } from "../../../lib/db";
import { workbenchCoverage } from "../../../workbench-server/coverage-cache";

// POST /api/webhooks/vxture (Product Integration Rules, C3). Verify
// over RAW bytes first (401 on failure / stale timestamp), then hand to the
// idempotent + ordered handler. A processing error returns 500 so the platform
// retries; a valid-but-duplicate/stale event still acks 2xx.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const MAX_BODY_BYTES = 64 * 1024;

async function readDelivery(req: Request): Promise<Buffer | null> {
  if (!req.body) return Buffer.alloc(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, length);
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

// The product this webhook accepts events for. BRAND, never OIDC_CLIENT_ID: the
// beta client is `bidproposal-beta` while the product code stays `bidproposal`, so deriving
// it from the client id would make a beta stack reject every event as
// wrong-product.
function productCode(): string {
  return BRAND.productCode;
}

/**
 * Evict the C2 cache for a workspace whose subscription changed.
 *
 * Deliberately swallowing: this runs inside a webhook whose contract is "2xx
 * means recorded". Constructing the entitlement resolver can throw (a deployed
 * stage with no platform config refuses the mock resolver), and letting that
 * escape would turn a correctly-verified, correctly-recorded delivery into a
 * 500 - which the platform retries forever, on an event that already succeeded.
 * A missed eviction costs at most 45 seconds of stale tier; a retry storm costs
 * more.
 */
function evictEntitlement(workspaceId: string): void {
  workbenchCoverage.invalidate(workspaceId);
  // Model execution always reads live C2 and assignment decisions.
  if (isDeployedStage()) return;
  try {
    getEntitlementResolver().invalidate(workspaceId);
  } catch (err) {
    console.error(`[provisioning] entitlement cache eviction failed for ${workspaceId}:`, err);
  }
}

export async function POST(req: Request): Promise<Response> {
  const raw = await readDelivery(req);
  if (!raw) return new Response("delivery too large", { status: 413 });
  const sig = req.headers.get("x-vxture-signature");
  if (!verifySignature(raw, sig, webhookSecrets())) {
    return new Response("invalid signature", { status: 401 });
  }
  let payload: Record<string, unknown> | null;
  try {
    payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown> | null;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const lifecycle = payload?.type === "tenant.provisioned" || payload?.type === "tenant.deprovisioned";
  const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  if (!payload || !validId(payload.id) || !isUuid(payload.workspace_id) || !isUuid(payload.tenant_id) ||
      typeof payload.type !== "string" || !/^[a-z][a-z0-9_.]{0,63}$/.test(payload.type) ||
      typeof payload.occurred_at !== "number" || !Number.isFinite(payload.occurred_at) || payload.occurred_at <= 0 ||
      (req.headers.has("x-vxture-delivery") && req.headers.get("x-vxture-delivery") !== payload.id) ||
      (req.headers.has("x-vxture-event") && req.headers.get("x-vxture-event") !== payload.type) ||
      (lifecycle ? typeof payload.seq !== "number" || !Number.isSafeInteger(payload.seq) || payload.seq < 0 : "seq" in payload)) {
    return new Response("invalid delivery envelope", { status: 400 });
  }
  if (payload.application !== productCode()) return new Response("invalid product", { status: 400 });
  const persistent = prismaEnabled();
  if (isDeployedStage() && !persistent) {
    return new Response("provisioning store is unavailable", { status: 503 });
  }

  const event: ProvisioningEvent = {
    id: payload.id,
    type: payload.type,
    occurred_at: payload.occurred_at,
    ...(typeof payload.seq === "number" ? { seq: payload.seq } : {}),
    workspace_id: payload.workspace_id,
    tenant_id: payload.tenant_id,
    application: productCode(),
    plan: typeof payload.plan === "string" ? payload.plan : null,
    data: payload.data,
  };

  try {
    if (persistent) {
      const db = await getPrismaClient();
      // Advance sequence, apply the lifecycle change, and record the receipt together.
      await db.$transaction((tx) => handleProvisioning(event, {
        store: new PrismaProvisioningStore(tx), product: productCode(),
      }), { isolationLevel: "Serializable" });
      evictEntitlement(event.workspace_id);
    } else {
      await handleProvisioning(event, {
        store: getProvisioningStore(), product: productCode(), onSubscriptionChanged: evictEntitlement,
      });
    }
  } catch {
    return new Response("processing error", { status: 500 }); // platform will retry
  }
  return new Response("", { status: 200 });
}
