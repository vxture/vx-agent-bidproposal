/**
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { authorizeExecution, type Principal } from "./identity";
import { toAuthUser } from "../auth/lib/claims";
import { EMPTY_ENTITLEMENT } from "../entitlement/types";
const pinned: Principal = {
  sessionId: "product-session",
  sub: "user-a",
  orgId: "org-a",
  workspaceId: "workspace-a",
};
function context(changes: Record<string, unknown> = {}) {
  return {
    user: toAuthUser({
      sub: pinned.sub,
      active_org: pinned.orgId,
      active_workspace: pinned.workspaceId,
      account_status: "active",
      ...changes,
    }),
    accessToken: "server-token",
    idToken: "server-id-token",
  };
}
test("background execution refreshes only its pinned Bid session and rechecks coverage", async () => {
  let checked = 0;
  const caller = await authorizeExecution(pinned, {
    session: async (_cfg, sessionId) => {
      assert.equal(sessionId, pinned.sessionId);
      return context();
    },
    coverage: async (caller) => {
      assert.equal(caller.sub, pinned.sub);
      assert.equal(caller.workspaceId, pinned.workspaceId);
      assert.equal(caller.mint.subjectToken, "server-token");
      checked++;
      return {
        ...EMPTY_ENTITLEMENT,
        product: "bidproposal",
        workspace_id: pinned.workspaceId,
        tier: "starter",
      };
    },
  });
  assert.equal(checked, 1);
  assert.equal(caller.orgId, pinned.orgId);
});
test("expired/revoked sessions, changed workspace/organization/subject and inactive accounts cannot spend", async () => {
  for (const result of [
    null,
    context({ active_workspace: "workspace-b" }),
    context({ active_org: "org-b" }),
    context({ sub: "user-b" }),
    context({ account_status: "suspended" }),
  ]) {
    let checked = false;
    await assert.rejects(
      authorizeExecution(pinned, {
        session: async () => result,
        coverage: async () => {
          checked = true;
          throw Error("must not run");
        },
      }),
    );
    assert.equal(checked, false);
  }
  await assert.rejects(
    authorizeExecution(pinned, {
      session: async () => context(),
      coverage: async () => {
        throw Error("C2 unavailable");
      },
    }),
    /C2 unavailable/,
  );
});
