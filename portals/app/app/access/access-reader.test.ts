/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Test
 * @author AI-Generated
 * @date 2026-11-24
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAccessReader } from "./access-reader";

test("concurrent checks share one request; a later retry fetches fresh authority", async () => {
  let calls = 0;
  let finish: (() => void) | undefined;
  const reader = createAccessReader(async (url, options) => {
    calls++;
    assert.equal(url, "/api/access");
    assert.equal(options?.cache, "no-store");
    if (calls === 1) await new Promise<void>(resolve => { finish = resolve; });
    return Response.json({ status: calls === 1 ? "unassigned" : "anonymous" });
  });
  const first = reader();
  const second = reader();
  assert.equal(first, second);
  await Promise.resolve();
  finish!();
  assert.deepEqual(await first, { status: "unassigned" });
  assert.deepEqual(await reader(), { status: "anonymous" });
  assert.equal(calls, 2);
});

test("503 remains unavailable and malformed or failed responses never grant access", async () => {
  const unavailable = createAccessReader(async () => Response.json({ status: "unavailable" }, { status: 503 }));
  assert.deepEqual(await unavailable(), { status: "unavailable" });
  for (const body of [{ status: "unknown" }, { status: "authenticated", gates: { productAccess: true } }, null]) {
    const reader = createAccessReader(async () => Response.json(body));
    await assert.rejects(reader(), /Invalid access response/);
  }
  const denied = createAccessReader(async () => Response.json({ status: "anonymous" }, { status: 403 }));
  await assert.rejects(denied(), /Access check failed/);
  const misleading = createAccessReader(async () => Response.json({ status: "open", reason: "dev-no-oidc" }, { status: 503 }));
  await assert.rejects(misleading(), /Access check failed/);
});

test("timeout aborts the check and permits a new attempt", async () => {
  let calls = 0;
  const reader = createAccessReader(async (_url, options) => {
    if (++calls > 1) return Response.json({ status: "anonymous" });
    return new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  }, 10);
  await assert.rejects(reader(), /aborted/);
  assert.deepEqual(await reader(), { status: "anonymous" });
});

test("synchronous transport failure releases the shared request", async () => {
  let calls = 0;
  const reader = createAccessReader(() => {
    if (++calls === 1) throw new Error("transport failed");
    return Promise.resolve(Response.json({ status: "anonymous" }));
  });
  await assert.rejects(reader(), /transport failed/);
  assert.deepEqual(await reader(), { status: "anonymous" });
});
