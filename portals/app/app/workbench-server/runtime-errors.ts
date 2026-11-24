/**
 * Preserve the original Harness retry contract for direct server calls.
 * @package @bidproposal/app
 * @layer Application
 * @category RuntimeErrors
 * @author AI-Generated
 * @date 2026-11-25
 */
import { TransientError } from "@vxture/ruyin-core";
import { AtlasError } from "../chat/atlas-client";
import { S2STokenError } from "../lib/s2s-token";
import { WorkbenchError } from "./identity";

/** Temporary transport/access failures park and retry; commercial denials do not. */
export function runtimeFailure(error: unknown): unknown {
  const temporary =
    (error instanceof AtlasError && error.retryable) ||
    (error instanceof S2STokenError && error.retryable) ||
    (error instanceof WorkbenchError &&
      (error.status === 429 || error.status >= 500)) ||
    (error instanceof DOMException &&
      ["TimeoutError", "AbortError"].includes(error.name));
  if (temporary)
    return new TransientError(
      "The product execution service is temporarily unavailable",
      { cause: error },
    );
  return error;
}
