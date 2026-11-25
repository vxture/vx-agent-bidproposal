/**
 * Product-owned absolute storage observations over the existing C3 contract.
 * @package @bidproposal/app
 * @layer Application
 * @category Usage
 * @author AI-Generated
 * @date 2026-11-25
 */
import { BRAND } from "@bidproposal/shared/brand";
import { assertInternalTarget } from "../../lib/internal-target";
import {
  invalidateS2SToken,
  mintS2SToken,
  PLATFORM_AUDIENCE,
} from "../../lib/s2s-token";

export interface StorageObservation {
  workspace_id: string;
  product: string;
  metric: "storage.bytes";
  value: string;
  observed_at: string;
}
export type GaugeReceipt = StorageObservation & { applied: boolean };
export type GaugeReporter = (
  observation: StorageObservation,
) => Promise<GaugeReceipt>;

function validBytes(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(0|[1-9]\d*)$/.test(value) &&
    Number.isSafeInteger(Number(value))
  );
}
function validTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function matchedReceipt(
  raw: unknown,
  observation: StorageObservation,
): GaugeReceipt {
  const receipt = raw as Partial<GaugeReceipt> | null;
  if (
    !receipt ||
    receipt.workspace_id !== observation.workspace_id ||
    receipt.product !== observation.product ||
    receipt.metric !== observation.metric ||
    typeof receipt.applied !== "boolean" ||
    !validBytes(receipt.value) ||
    !validTime(receipt.observed_at)
  )
    throw Error("Invalid storage observation receipt");
  const responseTime = Date.parse(receipt.observed_at),
    requestTime = Date.parse(observation.observed_at);
  if (
    responseTime < requestTime ||
    (receipt.applied &&
      (receipt.value !== observation.value || responseTime !== requestTime))
  )
    throw Error("Invalid storage observation receipt");
  return receipt as GaugeReceipt;
}

// --- Exact request and acknowledgment ------------------------------------
/** No tokens leave this server-side caller; only matched receipts acknowledge a report. */
export function makePlatformGauge(
  baseUrl: string,
  mint = (workspaceId: string) =>
    mintS2SToken(PLATFORM_AUDIENCE, { workspaceId }),
  send: typeof fetch = fetch,
): GaugeReporter {
  return async (observation) => {
    if (
      observation.product !== BRAND.productCode ||
      observation.metric !== "storage.bytes" ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
        observation.workspace_id,
      ) ||
      !validBytes(observation.value) ||
      !validTime(observation.observed_at)
    )
      throw Error("Invalid storage observation");
    const url = assertInternalTarget(
      baseUrl.replace(/\/$/, "") + "/usage/gauge",
    );
    const response = await send(url, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: "Bearer " + (await mint(observation.workspace_id)),
      },
      body: JSON.stringify(observation),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401)
      invalidateS2SToken(PLATFORM_AUDIENCE, {
        workspaceId: observation.workspace_id,
      });
    if (response.status !== 200)
      throw Error("Storage observation was not acknowledged");
    return matchedReceipt(await response.json(), observation);
  };
}
