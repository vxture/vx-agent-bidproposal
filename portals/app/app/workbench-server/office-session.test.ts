import test from "node:test";
import assert from "node:assert/strict";
import { sealOfficeTicket, openOfficeTicket } from "./office-session";
test("office tickets encrypt product sessions and reject other keys or tampering", async () => {
  const secret = "test-only-office-secret".repeat(3);
  const value = { principal: { sessionId: "private-rp-session", sub: "member", orgId: "org", workspaceId: "workspace" }, resourceId: "resource", version: 1, hash: "abc", key: "document-key", editable: false };
  const token = await sealOfficeTicket(value, secret);
  assert.equal(token.includes(value.principal.sessionId), false);
  const opened = await openOfficeTicket(token, secret);
  assert.deepEqual(opened.principal, value.principal);
  assert.equal(opened.resourceId, value.resourceId);
  assert.equal(opened.editable, false);
  await assert.rejects(openOfficeTicket(token, "other-key".repeat(8)));
  const pieces = token.split("."); pieces[3] = (pieces[3]![0] === "a" ? "b" : "a") + pieces[3]!.slice(1);
  await assert.rejects(openOfficeTicket(pieces.join("."), secret));
});
