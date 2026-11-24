/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Test
 * @author AI-Generated
 * @date 2026-11-24
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTRY_COPY, entryKindFor, gateLoginUrl } from "./entry-content";
import type { AccessState } from "./types";
import { makeEntitlement } from "../entitlement/resolver";
import { toAuthUser } from "../auth/lib/claims";
import type { Entitlement } from "../entitlement/types";

function state(status: Entitlement["status"] = null): AccessState {
  return { status: "authenticated", user: toAuthUser({ sub: "usr_test" }),
    entitlement: makeEntitlement("ws_test", "bidproposal", { status }),
    gates: { productAccess: false, dataAccess: false, cta: "renew" } };
}

test("entry distinguishes missing subscription, explicit expiry and other restrictions", () => {
  assert.equal(entryKindFor(state()), "subscription");
  assert.equal(entryKindFor(state("expired")), "expired");
  for (const status of ["suspended", "cancelled", "overdue", "active"] as const) {
    assert.equal(entryKindFor(state(status)), "restricted", status);
  }
});

test("authority failures and member assignment denial never become subscription offers", () => {
  assert.equal(entryKindFor({ status: "unavailable" }), "access-unavailable");
  assert.equal(entryKindFor({ status: "unassigned" }), "unassigned");
  assert.equal(entryKindFor({ status: "inactive-account" }), "inactive");
  assert.equal(entryKindFor({ status: "unconfigured" }), "unavailable");
});

test("access gates do not infer buying permission from account or workspace roles", () => {
  const owner = state();
  assert.equal(owner.status, "authenticated");
  if (owner.status !== "authenticated") return;
  owner.user.roles = ["workspace:owner", "org:owner"];
  owner.user.canManage = true;
  for (const locale of ["zh-CN", "en"] as const) {
    assert.equal(ENTRY_COPY[locale][entryKindFor(owner)].action, ENTRY_COPY[locale].unassigned.action);
  }
});

test("login preserves a safe target and always returns through a fresh gate check", () => {
  const login = new URL(gateLoginUrl("/proposal/123?tab=outline"), "https://bidproposal.ruyin.work");
  assert.equal(login.pathname, "/auth/login");
  const gate = new URL(login.searchParams.get("returnTo")!, login.origin);
  assert.equal(gate.pathname, "/gate");
  assert.equal(gate.searchParams.get("from"), "/proposal/123?tab=outline");
  for (const target of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/gate?from=/gate"]) {
    assert.equal(gateLoginUrl(target), "/auth/login?returnTo=%2Fgate");
  }
});
