/**
 * @package @bidproposal/app
 * @layer Application
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { serverKeys } from "./keys";
import {
  namespaceFor,
  samePrincipal,
  type Principal,
  type WorkbenchAccess,
} from "./identity";
import { BidRuntime } from "./service";
import { dispatch } from "./dispatch";
import { runtimeContract } from "./contract";
import { EMPTY_ENTITLEMENT } from "../entitlement/types";

const principal: Principal = {
  sessionId: "opaque-own-product-session",
  sub: "user-a",
  orgId: "org-a",
  workspaceId: "workspace-a",
};
function access(p = principal): WorkbenchAccess {
  return {
    principal: p,
    caller: {
      sub: p.sub,
      orgId: p.orgId,
      workspaceId: p.workspaceId,
      mint: { subjectToken: "test-only" },
    },
    entitlement: {
      ...EMPTY_ENTITLEMENT,
      workspace_id: p.workspaceId,
      product: "bidproposal",
      tier: "starter",
      status: "active",
    },
  };
}
function make(
  root: string,
  p = principal,
  masterHex = "ab".repeat(32),
  layout?: ConstructorParameters<typeof BidRuntime>[0]["layout"],
) {
  return new BidRuntime({
    root,
    masterHex,
    principal: p,
    contract: runtimeContract(),
    reader: async (bytes, _format, start, unit) => {
      start({ engine: { name: "test-reader" }, total: 1 });
      unit({
        index: 0,
        markdown: bytes.toString(),
        text: bytes.toString(),
        location: { page: 1 },
        tables: [],
        images: [],
        flags: [],
      });
    },
    layout:
      layout ??
      (async () => {
        throw Error("Test does not provide a layout engine");
      }),
    gateway: {
      turn: async () => ({ kind: "content", content: '{"chapters":[]}' }),
    },
  });
}
async function call(
  service: BidRuntime,
  path: string[],
  method = "GET",
  body?: unknown,
  a = access(),
) {
  const request = new Request(
    "https://bid.test/api/workbench/" + path.join("/"),
    {
      method,
      ...(body
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
  return service.run(a, () => dispatch(service, a, path, request));
}

// --- Identity and encryption boundaries ----------------------------------
test("workspace namespace and encryption keys include organization and container scope", () => {
  assert.notEqual(
    namespaceFor(principal),
    namespaceFor({ ...principal, orgId: "org-b" }),
  );
  assert.notEqual(
    namespaceFor(principal),
    namespaceFor({ ...principal, workspaceId: "workspace-b" }),
  );
  assert.equal(
    samePrincipal(principal, { ...principal, sessionId: "new-session" }),
    true,
  );
  assert.equal(
    samePrincipal(principal, { ...principal, sub: "user-b" }),
    false,
  );
  const root = join(tmpdir(), "bid-key-boundary"),
    key = randomBytes(32).toString("hex"),
    provider = serverKeys(root, namespaceFor(principal), key);
  assert.notEqual(
    provider.workspaceKeyHex(join(root, "projects/p1")),
    provider.workspaceKeyHex(join(root, "projects/p2")),
  );
  assert.throws(
    () => provider.workspaceKeyHex(join(root, "../escape")),
    /invalid/,
  );
  assert.throws(
    () => serverKeys(root, namespaceFor(principal), ""),
    /required/,
  );
});
test("project documents preserve original revisions, opaque identity and durable reopen", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-test-"));
  let service = make(root);
  try {
    const created = await call(service, ["host", "projects"], "POST", {
      product: "bidproposal",
      name: "Synthetic bid",
    });
    const project = await created.json();
    assert.match(project.id, /^prj_[a-f0-9]{32}$/);
    assert.equal(
      (
        await call(
          service,
          ["projects", project.id, "documents", "bid_draft"],
          "PUT",
          { markdown: "Original chapter", revision: 0 },
        )
      ).status,
      200,
    );
    await assert.rejects(
      call(service, ["projects", project.id, "documents", "bid_draft"], "PUT", {
        markdown: "Stale replacement",
        revision: 0,
      }),
      /changed/,
    );
    service.storage
      .openHostStore(project.id)!
      .putProductDocument(
        "bidproposal",
        "runtime_auth_test",
        principal.sessionId,
        0,
      );
    await assert.rejects(
      call(service, ["projects", project.id, "documents", "runtime_auth_test"]),
      /unavailable/,
    );
    await assert.rejects(
      call(
        service,
        ["projects", project.id],
        "GET",
        undefined,
        access({ ...principal, workspaceId: "other" }),
      ),
      /unavailable/,
    );
    const view = await (
      await call(service, ["host", "projects", project.id])
    ).json();
    assert.equal(view.product.id, "bidproposal");
    assert.ok(
      view.tasks.some((task: { id: string }) => task.id === "plan_outline"),
    );
    service.close();
    service = make(root);
    const document = await (
      await call(service, ["projects", project.id, "documents", "bid_draft"])
    ).json();
    assert.equal(document.markdown, "Original chapter");
    assert.equal(document.revision, 1);
    const foreign = make(root, { ...principal, orgId: "org-b" });
    try {
      await assert.rejects(
        call(
          foreign,
          ["projects", project.id],
          "GET",
          undefined,
          access({ ...principal, orgId: "org-b" }),
        ),
        /not found|does not exist|No project|unavailable/i,
      );
    } finally {
      foreign.close();
    }
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});
test("proposal and retained-file limits serialize concurrent requests and respect explicit zero", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-quota-")),
    service = make(root);
  try {
    const a = access();
    a.entitlement.limits["proposal.max"] = 1;
    const results = await Promise.allSettled([
      service.run(a, () => service.create("One", a.entitlement)),
      service.run(a, () => service.create("Two", a.entitlement)),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const pid = (await service.runtime.listProjects())[0]!.id;
    await assert.rejects(
      service.upload(pid, "source.md", Buffer.from("abc"), 0),
      /storage limit/,
    );
    const file = await service.upload(pid, "source.md", Buffer.from("abc"), 3);
    await service.upload(pid, "same.md", Buffer.from("abc"), 3);
    assert.equal(await service.storageBytes(), 3);
    await assert.rejects(
      service.upload(pid, "new.md", Buffer.from("d"), 3),
      /storage limit/,
    );
    const response = await call(service, [
      "host",
      "projects",
      pid,
      "files",
      file.id,
    ]);
    assert.equal(await response.text(), "abc");
    await assert.rejects(
      service.upload(pid, "../../escape.md", Buffer.from("x"), 100),
      /Select a/,
    );
    await assert.rejects(
      call(service, ["host", "system", "data-dir"], "POST", { target: "/etc" }),
      /unavailable/,
    );
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("runtime retains real consent, human verification and durable original task results", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-consent-")),
    service = make(root);
  try {
    const a = access(),
      project = await service.run(a, () =>
        service.create("Consent test", a.entitlement),
      ),
      pid = project.id;
    await call(
      service,
      ["projects", pid, "documents", "bid_plan_context"],
      "PUT",
      {
        markdown: JSON.stringify({
          requirementsRevision: 1,
          configuration: {},
          requirements: [],
        }),
        revision: 0,
      },
    );
    const started = await (
      await call(service, ["projects", pid, "tasks"], "POST", {
        taskId: "plan_outline",
      })
    ).json();
    const wait = async (state: string) => {
      for (let i = 0; i < 100; i++) {
        const task = (await service.runtime.listTaskInstances(pid)).find(
          (t) => t.id === started.id,
        )!;
        if (task.state === state) return task;
        await new Promise((done) => setTimeout(done, 10));
      }
      throw Error("Task did not reach " + state);
    };
    const consent = await wait("waiting_human");
    assert.equal(
      consent.checkpoints.find((c) => !c.decision)!.kind,
      "context_confirm",
    );
    assert.equal(
      service.storage
        .openHostStore(pid)!
        .getProductDocument("bidproposal", "runtime_auth_task_" + started.id)!
        .markdown.includes(principal.sessionId),
      true,
    );
    await assert.rejects(
      call(service, ["projects", pid, "tasks", started.id, "result"]),
      /Review the task/,
    );
    await call(
      service,
      ["host", "projects", pid, "tasks", started.id, "decision"],
      "POST",
      { approve: true },
    );
    let review;
    for (let i = 0; i < 100; i++) {
      const candidate = (await service.runtime.listTaskInstances(pid)).find(
        (t) => t.id === started.id,
      )!;
      if (
        candidate.checkpoints.some(
          (c) => !c.decision && c.kind !== "context_confirm",
        )
      ) {
        review = candidate;
        break;
      }
      await new Promise((done) => setTimeout(done, 10));
    }
    assert.ok(review);
    assert.equal(review.state, "waiting_human");
    await call(
      service,
      ["host", "projects", pid, "tasks", started.id, "decision"],
      "POST",
      { approve: true },
    );
    await wait("completed");
    const result = await (
      await call(service, ["projects", pid, "tasks", started.id, "result"])
    ).json();
    assert.equal(result.content.proposal_generation, '{"chapters":[]}');
    assert.doesNotMatch(
      JSON.stringify(result),
      /opaque-own-product-session|server-token/,
    );
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("saved export bytes count toward storage once and download tickets stay scoped and single use", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-render-")),
    service = make(root, principal, "ab".repeat(32), async (bytes) => ({
      docx: Buffer.from(bytes),
      pdf: Buffer.from("%PDF-synthetic-quota-test"),
      pages: 1,
      engine: "Synthetic test engine",
    }));
  try {
    const a = access(),
      project = await service.run(a, () =>
        service.create("Export limit", a.entitlement),
      ),
      pid = project.id;
    await service.document(pid, "bid_manuscript", {
      markdown: "# Synthetic manuscript",
      revision: 0,
    });
    const request = {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Synthetic",
      source: { id: "bid_manuscript", revision: 1 },
    };
    await service.createRender(pid, request, 1);
    for (
      let i = 0;
      i < 100 &&
      service.renders.get(pid, "bidproposal", request.id)?.state !== "failed";
      i++
    )
      await new Promise((done) => setTimeout(done, 10));
    assert.equal(
      service.renders.get(pid, "bidproposal", request.id)!.state,
      "failed",
    );
    assert.equal(
      service.storage
        .openHostStore(pid)!
        .getProductDocument("bidproposal", "runtime_output_" + request.id),
      undefined,
    );
    assert.equal(await service.storageBytes(), 0);
    const accepted = { ...request, id: "22222222-2222-4222-8222-222222222222" };
    await service.createRender(pid, accepted, 1000000);
    for (
      let i = 0;
      i < 100 &&
      service.renders.get(pid, "bidproposal", accepted.id)?.state !==
        "completed";
      i++
    )
      await new Promise((done) => setTimeout(done, 10));
    assert.equal(
      service.renders.get(pid, "bidproposal", accepted.id)!.state,
      "completed",
    );
    assert.ok((await service.storageBytes()) > 0);
    const ticket = await (
      await call(
        service,
        ["projects", pid, "renders", accepted.id, "downloads", "pdf"],
        "POST",
      )
    ).json();
    const token = ticket.path.split("/").at(-1);
    await assert.rejects(
      call(
        service,
        ["downloads", token],
        "GET",
        undefined,
        access({ ...principal, sub: "other" }),
      ),
      /unavailable/,
    );
    assert.equal(
      (await call(service, ["downloads", token])).headers.get("content-type"),
      "application/pdf",
    );
    await assert.rejects(call(service, ["downloads", token]), /unavailable/);
    const free = access();
    free.entitlement.tier = "free";
    await assert.rejects(
      call(
        service,
        ["projects", pid, "renders", accepted.id, "downloads", "pdf"],
        "POST",
        undefined,
        free,
      ),
      /paid plan/,
    );
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});
