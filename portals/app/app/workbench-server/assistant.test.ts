import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { SqliteStoragePort } from "@vxture/ruyin-node-runtime";
import { AssistantSessions } from "./assistant";
const principal = {
  sessionId: "test-session",
  sub: "member-a",
  orgId: "org-a",
  workspaceId: "workspace-a",
};
test("assistant history survives encrypted reopen, isolates members and rejects stale writes", async () => {
  const root = mkdtempSync(join(tmpdir(), "jadera-assistant-"));
  let storage = new SqliteStoragePort(root, {
    workspaceKeyHex: () => "ab".repeat(32),
  });
  const sessions = () =>
    new AssistantSessions(
      storage.openLibraryStore("workspace-a", "bidproposal").store,
      async () => "Source-grounded suggestion",
    );
  try {
    let api = sessions();
    const requestId = randomUUID();
    const first = await api.send(principal, {
      requestId,
      revision: 0,
      message: "Prepare the response",
      projectId: "project-a",
    });
    assert.equal(first.messages.length, 2);
    assert.equal(first.state, "ready");
    assert.equal(
      (
        await api.send(principal, {
          requestId,
          revision: 0,
          message: "Prepare the response",
        })
      ).id,
      first.id,
    );
    assert.deepEqual(
      await api.send(principal, {
        id: first.id,
        requestId,
        revision: 0,
        message: "Prepare the response",
      }),
      first,
    );
    await assert.rejects(
      api.send(principal, {
        id: first.id,
        requestId: randomUUID(),
        revision: 0,
        message: "stale",
      }),
      /Reload/,
    );
    assert.equal(api.list({ ...principal, sub: "member-b" }).length, 0);
    assert.throws(
      () => api.get({ ...principal, sub: "member-b" }, first.id),
      /unavailable/,
    );
    storage.closeAll();
    storage = new SqliteStoragePort(root, {
      workspaceKeyHex: () => "ab".repeat(32),
    });
    api = sessions();
    assert.deepEqual(api.get(principal, first.id), first);
    const next = await api.send(principal, {
      id: first.id,
      requestId: randomUUID(),
      revision: first.revision,
      message: "Continue",
    });
    assert.equal(next.messages.length, 4);
    assert.equal(next.projectId, "project-a");
    api.archive(principal, next.id, next.revision);
    assert.equal(api.list(principal).length, 0);
    assert.equal(api.get(principal, next.id).messages.length, 4);
    await assert.rejects(
      api.send(principal, {
        id: next.id,
        requestId: randomUUID(),
        revision: next.revision + 1,
        message: "archived",
      }),
      /new conversation/,
    );
  } finally {
    storage.closeAll();
    rmSync(root, { recursive: true, force: true });
  }
});
test("assistant records a failed inference without inventing a response and guards concurrent requests", async () => {
  const root = mkdtempSync(join(tmpdir(), "jadera-assistant-failure-")),
    storage = new SqliteStoragePort(root, {
      workspaceKeyHex: () => "cd".repeat(32),
    });
  let finish: (value: string) => void = () => {};
  const api = new AssistantSessions(
    storage.openLibraryStore("workspace-a", "bidproposal").store,
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  try {
    const pending = api.send(principal, {
      requestId: randomUUID(),
      revision: 0,
      message: "first",
    });
    const running = api.list(principal)[0]!;
    assert.equal(running.state, "running");
    await assert.rejects(
      api.send(principal, {
        id: running.id,
        requestId: randomUUID(),
        revision: running.revision,
        message: "concurrent",
      }),
      /current answer/,
    );
    finish("answer");
    await pending;
    assert.equal(api.activeCount, 0);
    const failure = new AssistantSessions(
      storage.openLibraryStore("workspace-a", "bidproposal").store,
      async () => {
        throw Error("provider unavailable");
      },
    );
    const result = await failure.send(principal, {
      requestId: randomUUID(),
      revision: 0,
      message: "fail",
    });
    assert.equal(result.state, "failed");
    const failed = failure
      .list(principal)
      .find((row) => row.state === "failed")!;
    assert.equal(failed.messages.length, 1);
    assert.equal(failed.messages[0]?.role, "user");
  } finally {
    storage.closeAll();
    rmSync(root, { recursive: true, force: true });
  }
});
