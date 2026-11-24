/**
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { TransientError } from "@vxture/ruyin-core";
import { AtlasError } from "../chat/atlas-client";
import { S2STokenError } from "../lib/s2s-token";
import { WorkbenchError } from "./identity";
import { runtimeFailure } from "./runtime-errors";

test("direct server execution preserves parking for transient failures without retrying commercial or authentication denial", () => {
  for (const error of [
    new AtlasError(429, {
      code: "RATE_LIMITED",
      message: "busy",
      retryable: true,
    }),
    new S2STokenError(503, "temporarily_unavailable", "busy"),
    new WorkbenchError(503, "ENTITLEMENT_UNAVAILABLE", "busy"),
    new DOMException("timeout", "TimeoutError"),
  ])
    assert.ok(runtimeFailure(error) instanceof TransientError);
  for (const error of [
    new AtlasError(429, {
      code: "QUOTA_EXCEEDED",
      message: "limit",
      retryable: false,
    }),
    new WorkbenchError(401, "AUTH_REQUIRED", "sign in"),
    new WorkbenchError(403, "NOT_ENTITLED", "denied"),
    new Error("invalid output"),
  ])
    assert.equal(runtimeFailure(error), error);
});
