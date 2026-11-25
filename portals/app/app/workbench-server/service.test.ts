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
import type { StorageObservation } from "../usage/lib/gauge";
import { DEFAULT_REQUIREMENTS } from "@bidproposal/shared/compilations";

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
      limits: {},
      quota_pools: [],
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
  ports: Partial<
    Pick<
      ConstructorParameters<typeof BidRuntime>[0],
      "storageAccess" | "reportStorage" | "layoutCacheVersion"
    >
  > = {},
) {
  return new BidRuntime({
    root,
    masterHex,
    principal: p,
    layoutCacheVersion: ports.layoutCacheVersion ?? "cd".repeat(32),
    storageAccess: ports.storageAccess ?? (async () => access(p).entitlement),
    reportStorage:
      ports.reportStorage ??
      (async (observation) => ({ ...observation, applied: true })),
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

test("compilation versions preserve V01, isolate plans and documents, and count one logical proposal after reopen", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-versions-"));
  let service = make(root);
  const a = access();
  a.entitlement.limits["proposal.max"] = 1;
  try {
    const project = await service.run(a, () =>
      service.create("Original bid", a.entitlement),
    );
    const pid = project.id;
    await call(service, ["projects", pid, "documents", "bid_draft"], "PUT", {
      markdown: "Original approved text",
      revision: 0,
    });
    const before = service.documents.list(pid, "bidproposal", "");
    const original = await (
      await call(service, ["projects", pid, "compilations"])
    ).json();
    assert.equal(original.items[0].label, "V01");
    assert.equal(original.revision, 0);
    assert.deepEqual(
      service.documents.list(pid, "bidproposal", ""),
      before,
      "reading historic projects writes nothing",
    );
    const input = {
      requestId: "11111111-1111-4111-8111-111111111111",
      label: "Technical option",
      revision: 0,
      reuseLibrary: false,
      requirements: {
        ...DEFAULT_REQUIREMENTS,
        pages: 120,
        volume: "technical",
        brief: "Measurable acceptance",
      },
    };
    const created = await (
      await call(service, ["projects", pid, "compilations"], "POST", input, a)
    ).json();
    const child = created.selectedId;
    assert.notEqual(child, pid);
    assert.equal(created.items.length, 2);
    assert.equal((await service.runtime.listProjects()).length, 2);
    assert.equal(
      (await (await call(service, ["host", "projects"])).json()).items.length,
      1,
    );
    assert.deepEqual(service.documents.list(pid, "bidproposal", ""), before);
    assert.equal(
      service.documents.get(child, "bidproposal", "bid_draft"),
      undefined,
    );
    const brief = await (
      await call(service, ["projects", child, "compilation-brief"])
    ).json();
    assert.equal(brief.value.pages, 120);
    assert.equal(brief.value.volume, "technical");
    assert.equal(brief.value.brief, "Measurable acceptance");
    await call(service, ["projects", child, "documents", "bid_draft"], "PUT", {
      markdown: "Separate technical draft",
      revision: 0,
    });
    assert.equal(
      service.documents.get(pid, "bidproposal", "bid_draft")?.markdown,
      "Original approved text",
    );
    const retry = await (
      await call(service, ["projects", pid, "compilations"], "POST", input, a)
    ).json();
    assert.equal(retry.selectedId, child);
    await assert.rejects(
      call(
        service,
        ["projects", pid, "compilations"],
        "POST",
        { ...input, requestId: "22222222-2222-4222-8222-222222222222" },
        a,
      ),
      /Versions changed/,
    );
    await assert.rejects(
      service.run(a, () => service.create("Another bid", a.entitlement)),
      /proposal limit/,
    );
    service.close();
    service = make(root);
    const reopened = await (
      await call(service, ["projects", child, "compilations"])
    ).json();
    assert.equal(reopened.rootId, pid);
    assert.equal(reopened.items.length, 2);
    assert.equal(
      service.documents.get(child, "bidproposal", "bid_draft")?.markdown,
      "Separate technical draft",
    );
    await call(service, ["projects", child, "archive"], "POST");
    await assert.rejects(
      call(service, ["projects", child, "documents", "bid_draft"], "PUT", {
        markdown: "Must fail",
        revision: 1,
      }),
      /archived/,
    );
    await assert.rejects(
      call(service, ["projects", pid, "compilations"], "POST", {
        ...input,
        revision: reopened.revision,
        requestId: "33333333-3333-4333-8333-333333333333",
      }),
      /archived/,
    );
    const bundle = await (
      await call(service, ["host", "projects", child, "export"])
    ).json();
    assert.equal(bundle.compilations.selectedId, child);
    assert.equal(bundle.compilations.rootId, pid);
    await call(service, ["projects", child, "restore"], "POST");
    await call(service, ["projects", child, "documents", "bid_draft"], "PUT", {
      markdown: "Restored edit",
      revision: 1,
    });
    const retryById = await (
      await call(service, ["projects", pid, "compilations"], "POST", {
        retryId: child,
      })
    ).json();
    assert.equal(retryById.selectedId, child);
    await call(
      service,
      ["projects", child, "documents", "bid_plan_context"],
      "PUT",
      {
        markdown: JSON.stringify({ configuration: {}, requirements: [] }),
        revision: 0,
      },
    );
    await call(service, ["projects", child, "tasks"], "POST", {
      taskId: "plan_outline",
    });
    await assert.rejects(
      call(service, ["projects", child, "compilation-brief"], "PUT", {
        value: { ...brief.value, pages: 121 },
        revision: brief.revision,
      }),
      /active tasks/,
    );
    await assert.rejects(
      call(service, ["projects", pid, "archive"], "POST"),
      /all compilation tasks/,
    );
    await call(service, ["projects", pid, "compilation-brief"], "PUT", {
      value: { ...DEFAULT_REQUIREMENTS, brief: "Independent original version" },
      revision: 0,
    });
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("version requirements change the actual plan with revision checks while retaining the original outline", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-version-brief-")),
    service = make(root);
  try {
    const a = access(),
      project = await service.run(a, () =>
        service.create("Brief", a.entitlement),
      ),
      pid = project.id;
    const plan = {
      ...DEFAULT_REQUIREMENTS,
      outline: [{ id: "chapter-a", title: "Response", requirementIds: ["r1"] }],
      approved: true,
      requirementsRevision: 3,
      template: null,
    };
    await call(service, ["projects", pid, "documents", "bid_plan"], "PUT", {
      markdown:
        "# Bid writing plan\n\n```json\n" + JSON.stringify(plan) + "\n```\n",
      revision: 0,
    });
    const saved = await (
      await call(service, ["projects", pid, "compilation-brief"], "PUT", {
        value: {
          ...DEFAULT_REQUIREMENTS,
          pages: 160,
          brief: "Focus on delivery",
        },
        revision: 1,
      })
    ).json();
    assert.equal(saved.revision, 2);
    const next = service.documents.get(pid, "bidproposal", "bid_plan")!;
    const value = JSON.parse(
      next.markdown.slice("# Bid writing plan\n\n```json\n".length, -5),
    );
    assert.equal(value.pages, 160);
    assert.equal(value.brief, "Focus on delivery");
    assert.equal(value.approved, false);
    assert.deepEqual(value.outline, plan.outline);
    await assert.rejects(
      call(service, ["projects", pid, "compilation-brief"], "PUT", {
        value: DEFAULT_REQUIREMENTS,
        revision: 1,
      }),
      /Requirements changed/,
    );
    await assert.rejects(
      call(service, ["projects", pid, "compilation-brief"], "PUT", {
        value: { ...DEFAULT_REQUIREMENTS, pages: 0 },
        revision: 2,
      }),
      /Invalid compilation/,
    );
    assert.equal(
      service.documents.get(pid, "bidproposal", "bid_plan")?.revision,
      2,
    );
    await assert.rejects(
      call(
        service,
        ["projects", pid, "compilation-brief"],
        "GET",
        undefined,
        access({ ...principal, workspaceId: "other" }),
      ),
      /unavailable/,
    );
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("reserved compilation IDs recover a container interrupted before its contract was written", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-version-partial-"));
  let service = make(root);
  try {
    const a = access(),
      project = await service.run(a, () =>
        service.create("Partial initialization", a.entitlement),
      );
    service.runtime.createProject = async () => {
      const id = service.compilations.group(project.id)!.items[1]!.id;
      const store = await service.storage.createProjectStore(id);
      await store.putMeta({ ...project, id });
      throw Error("Interrupted before contract");
    };
    await assert.rejects(
      call(service, ["projects", project.id, "compilations"], "POST", {
        label: "V02",
        requestId: "55555555-5555-4555-8555-555555555555",
        revision: 0,
        requirements: DEFAULT_REQUIREMENTS,
      }),
      /before contract/,
    );
    const child = service.compilations.group(project.id)!.items[1]!.id;
    service.close();
    service = make(root);
    const recovered = await (
      await call(service, ["projects", project.id, "compilations"])
    ).json();
    assert.equal(recovered.items[1].state, "ready");
    const view = await service.checkProject(child);
    assert.equal(view.meta.id, child);
    assert.equal(view.contract.product.id, "bidproposal");
    assert.ok((await service.runtime.listAuditEvents(child)).length);
    assert.equal((await service.runtime.listProjects()).length, 2);
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("interrupted compilation initialization recovers pinned library versions without copying tasks or approvals", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-version-recovery-"));
  let service = make(root);
  try {
    const a = access(),
      project = await service.run(a, () =>
        service.create("Pinned sources", a.entitlement),
      ),
      pid = project.id;
    const item = await (
      await call(service, ["library"], "POST", {
        name: "source.md",
        category: "qualification",
        base64: Buffer.from("Immutable evidence").toString("base64"),
      })
    ).json();
    for (
      let i = 0;
      i < 100 &&
      service.library.get(service.scope(), item.id)?.versions[0]?.reading
        ?.state !== "completed";
      i++
    )
      await new Promise((done) => setTimeout(done, 10));
    await call(service, ["projects", pid, "library-selection"], "POST", {
      id: item.id,
      version: 1,
      revision: 0,
    });
    const oldPin = service.library.pin;
    service.library.pin = async () => {
      throw Error("Synthetic interrupted initialization");
    };
    const input = {
      requestId: "44444444-4444-4444-8444-444444444444",
      label: "Alternative",
      revision: 0,
      reuseLibrary: true,
      requirements: DEFAULT_REQUIREMENTS,
    };
    await assert.rejects(
      call(service, ["projects", pid, "compilations"], "POST", input),
      /interrupted/,
    );
    service.library.pin = oldPin;
    const pending = await (
      await call(service, ["projects", pid, "compilations"])
    ).json();
    const child = pending.items[1].id;
    await assert.rejects(
      call(service, ["projects", child, "documents", "bid_plan"]),
      /pending/,
    );
    service.close();
    service = make(root);
    const reopened = await (
      await call(service, ["projects", pid, "compilations"])
    ).json();
    assert.equal(reopened.items[1].state, "ready");
    const pinned = service.library.selections(child, "bidproposal");
    assert.equal(pinned.items[0].version, 1);
    assert.equal(pinned.items[0].hash, item.versions[0].hash);
    assert.equal(
      await service.storageBytes(),
      Buffer.byteLength("Immutable evidence"),
    );
    assert.deepEqual(await service.runtime.listTaskInstances(child), []);
    assert.deepEqual(service.jobs.list(child, "bidproposal"), []);
    assert.deepEqual(service.renders.list(child, "bidproposal"), []);
    const retried = await (
      await call(service, ["projects", pid, "compilations"], "POST", input)
    ).json();
    assert.equal(retried.selectedId, child);
    assert.equal(retried.items.length, 2);
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

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
    const emptyCatalog = await (
      await call(service, ["host", "projects"])
    ).json();
    assert.equal(emptyCatalog.items[0].record, undefined);
    const recordedAt = "2026-11-25T02:10:00.000Z";
    await call(
      service,
      ["projects", project.id, "documents", "bid_workflow"],
      "PUT",
      {
        revision: 0,
        markdown:
          "# Bid workflow\n\n" +
          JSON.stringify({
            analysis: {
              startedAt: recordedAt,
              completedAt: "2026-11-25T02:18:00.000Z",
            },
          }),
      },
    );
    service.close();
    service = make(root);
    const document = await (
      await call(service, ["projects", project.id, "documents", "bid_draft"])
    ).json();
    assert.equal(document.markdown, "Original chapter");
    assert.equal(document.revision, 1);
    const reopenedCatalog = await (
      await call(service, ["host", "projects"])
    ).json();
    assert.deepEqual(reopenedCatalog.items[0].record, {
      stage: "\u62db\u6807\u89e3\u8bfb",
      stageIndex: 0,
      completed: 1,
      completedStages: [0],
      recordedAt: "2026-11-25T02:18:00.000Z",
      complete: false,
    });
    assert.equal(
      JSON.stringify(reopenedCatalog).includes(principal.sessionId),
      false,
    );
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
  let limit = 0;
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-quota-")),
    service = make(root, principal, "ab".repeat(32), undefined, {
      storageAccess: async () => ({
        ...access().entitlement,
        limits: { "storage.bytes.max": limit },
      }),
    });
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
      service.upload(pid, "source.md", Buffer.from("abc"), principal),
      /storage limit/,
    );
    limit = 3;
    const file = await service.upload(
      pid,
      "source.md",
      Buffer.from("abc"),
      principal,
    );
    await service.upload(pid, "same.md", Buffer.from("abc"), principal);
    assert.equal(await service.storageBytes(), 3);
    await assert.rejects(
      service.upload(pid, "new.md", Buffer.from("d"), principal),
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
      service.upload(pid, "../../escape.md", Buffer.from("x"), principal),
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
    assert.throws(
      () =>
        service.reauthorizeTask(pid, started.id, {
          ...principal,
          sub: "other-member",
        }),
      /original member/,
    );
    const freshSession = { ...principal, sessionId: "new-own-product-session" };
    service.reauthorizeTask(pid, started.id, freshSession);
    assert.match(
      service.documents.get(
        pid,
        "bidproposal",
        "runtime_auth_task_" + started.id,
      )!.markdown,
      /new-own-product-session/,
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
    const exported = await (
      await call(service, ["host", "projects", pid, "export"])
    ).text();
    assert.doesNotMatch(
      exported,
      /opaque-own-product-session|new-own-product-session|runtime_auth_/,
    );
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("saved export bytes count toward storage once and download tickets stay scoped and single use", async () => {
  let limit = 1;
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-render-")),
    service = make(
      root,
      principal,
      "ab".repeat(32),
      async (bytes) => ({
        docx: Buffer.from(bytes),
        pdf: Buffer.from("%PDF-synthetic-quota-test"),
        pages: 1,
        engine: "Synthetic test engine",
      }),
      {
        storageAccess: async () => ({
          ...access().entitlement,
          limits: { "storage.bytes.max": limit },
        }),
      },
    );
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
    await service.createRender(pid, request, principal);
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
    limit = 1000000;
    await service.createRender(pid, accepted, principal);
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

// --- Shared capacity and actual durable inventory -------------------------
test("fresh shared gauge capacity includes other products; deletion and retry survive encrypted reopen", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-gauge-"));
  const observations: StorageObservation[] = [];
  let reported = 0,
    external = 7,
    offline = false;
  const ports = {
    storageAccess: async (pinned: Principal) => {
      assert.equal(pinned.sessionId, principal.sessionId);
      assert.equal(observations.at(-1)?.value, String(reported));
      return {
        ...access().entitlement,
        quota_pools: [
          {
            metric: "storage.bytes",
            limit: 10,
            remaining: 10 - reported - external,
            priority: 1,
          },
        ],
      };
    },
    reportStorage: async (value: StorageObservation) => {
      if (offline) throw Error("offline");
      observations.push(value);
      reported = Number(value.value);
      return { ...value, applied: true };
    },
  };
  let service = make(root, principal, "ab".repeat(32), undefined, ports);
  try {
    const project = await call(service, ["host", "projects"], "POST", {
      name: "Shared gauge",
    });
    const pid = (await project.json()).id;
    const file = await service.upload(
      pid,
      "one.md",
      Buffer.from("abc"),
      principal,
    );
    await service.flushStorage();
    assert.equal(reported, 3);
    await assert.rejects(
      service.upload(pid, "two.md", Buffer.from("d"), principal),
      /storage limit/,
    );
    assert.equal(service.storage.openHostStore(pid)!.listFiles().length, 1);
    external = 20;
    const duplicate = await service.upload(
      pid,
      "duplicate.md",
      Buffer.from("abc"),
      principal,
    );
    assert.equal(await service.storageBytes(), 3);
    await service.removeFile(pid, file.id);
    await service.flushStorage();
    assert.equal(reported, 3);
    offline = true;
    await service.removeFile(pid, duplicate.id);
    assert.equal(await service.storageBytes(), 0);
    await assert.rejects(service.flushStorage(), /temporarily unavailable/);
    service.close();
    offline = false;
    service = make(root, principal, "ab".repeat(32), undefined, ports);
    await service.flushStorage();
    assert.equal(reported, 0);
    assert.ok(observations.at(-1)!.observed_at > observations[0]!.observed_at);
    const exported = await (
      await call(service, ["host", "projects", pid, "export"])
    ).text();
    assert.doesNotMatch(
      exported,
      /runtime_auth_storage_accounting|opaque-own-product-session/,
    );
    await assert.rejects(
      call(service, [
        "projects",
        pid,
        "documents",
        "runtime_auth_storage_accounting",
      ]),
      /unavailable/,
    );
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});
test("source/library duplicates count once and temporary parsing content is excluded", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-library-gauge-")),
    service = make(root);
  try {
    const project = await call(service, ["host", "projects"], "POST", {
      name: "Dedup library",
    });
    const pid = (await project.json()).id;
    await service.upload(pid, "source.md", Buffer.from("abc"), principal);
    await call(service, ["host", "library"], "POST", {
      name: "reference.md",
      category: "reference",
      base64: Buffer.from("abc").toString("base64"),
    });
    assert.equal(await service.storageBytes(), 3);
    await service.flushStorage();
    const files = service.storage.openHostStore(pid)!.listFiles();
    await service.removeFile(pid, files[0]!.id);
    assert.equal(await service.storageBytes(), 3);
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});
test("export finalization rechecks the pinned session and refuses a plan revoked during layout", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-render-reauth-"));
  let release!: () => void,
    started!: () => void,
    paidPlan = true,
    checked = 0;
  const ready = new Promise<void>((done) => {
    started = done;
  });
  const held = new Promise<void>((done) => {
    release = done;
  });
  const service = make(
    root,
    principal,
    "ab".repeat(32),
    async () => {
      started();
      await held;
      return {
        docx: Buffer.from("docx"),
        pdf: Buffer.from("pdf"),
        pages: 1,
        engine: "test",
      };
    },
    {
      storageAccess: async (pinned) => {
        assert.deepEqual(pinned, principal);
        checked++;
        return { ...access().entitlement, tier: paidPlan ? "starter" : "free" };
      },
    },
  );
  try {
    const project = await call(service, ["host", "projects"], "POST", {
      name: "Pinned export",
    });
    const pid = (await project.json()).id,
      id = "33333333-3333-4333-8333-333333333333";
    await service.document(pid, "bid_manuscript", {
      markdown: "# Synthetic",
      revision: 0,
    });
    await service.createRender(
      pid,
      {
        id,
        title: "Synthetic",
        source: { id: "bid_manuscript", revision: 1 },
      } as { id: string },
      principal,
    );
    await ready;
    paidPlan = false;
    release();
    for (
      let n = 0;
      n < 100 &&
      service.renders.get(pid, "bidproposal", id)?.state !== "failed";
      n++
    )
      await new Promise((done) => setTimeout(done, 10));
    assert.equal(checked, 1);
    assert.equal(service.renders.get(pid, "bidproposal", id)!.state, "failed");
    assert.equal(
      service.documents.get(pid, "bidproposal", "runtime_output_" + id),
      undefined,
    );
    assert.equal(await service.storageBytes(), 0);
  } finally {
    release();
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("identical completed exports reuse verified bytes across new source IDs and reopen without growing storage", async () => {
  const root = mkdtempSync(join(tmpdir(), "bid-runtime-export-dedup-"));
  let layouts = 0,
    limit = -1,
    paidPlan = true;
  const engine = async () => {
    layouts++;
    return {
      docx: Buffer.from("docx-version-" + layouts),
      pdf: Buffer.from("pdf-version-" + layouts),
      pages: 1,
      engine: "synthetic engine",
    };
  };
  const ports = {
    storageAccess: async () => ({
      ...access().entitlement,
      tier: paidPlan ? ("starter" as const) : ("free" as const),
      limits: { "storage.bytes.max": limit },
    }),
  };
  let service = make(root, principal, "ab".repeat(32), engine, ports);
  const completed = async (
    pid: string,
    id: string,
    source: string,
    fields = {
      projectName: "Project",
      documentName: "Bid",
      documentNumber: "001",
    },
    template?: { fileId: string; hash: string },
  ) => {
    await service.createRender(
      pid,
      {
        id,
        title: "Same export",
        source: { id: source, revision: 1 },
        fields,
        ...(template ? { template } : {}),
      } as { id: string },
      principal,
    );
    for (
      let n = 0;
      n < 100 &&
      service.renders.get(pid, "bidproposal", id)?.state !== "completed";
      n++
    )
      await new Promise((done) => setTimeout(done, 10));
    assert.equal(
      service.renders.get(pid, "bidproposal", id)!.state,
      "completed",
    );
    await service.flushStorage();
    return service.renders.file(pid, "bidproposal", id, "pdf").sha256;
  };
  try {
    const project = await call(service, ["host", "projects"], "POST", {
      name: "Repeated export",
    });
    const pid = (await project.json()).id;
    await service.document(pid, "original", {
      markdown: "# Same manuscript",
      revision: 0,
    });
    const first = await completed(
      pid,
      "44444444-4444-4444-8444-444444444444",
      "original",
    );
    const bytes = await service.storageBytes();
    limit = bytes;
    await service.document(pid, "same_content_new_source", {
      markdown: "# Same manuscript",
      revision: 0,
    });
    const second = await completed(
      pid,
      "55555555-5555-4555-8555-555555555555",
      "same_content_new_source",
    );
    assert.equal(second, first);
    assert.equal(layouts, 1);
    assert.equal(await service.storageBytes(), bytes);
    paidPlan = false;
    const refusedId = "99999999-9999-4999-8999-999999999999";
    await service.createRender(
      pid,
      {
        id: refusedId,
        title: "Same export",
        source: { id: "original", revision: 1 },
        fields: {
          projectName: "Project",
          documentName: "Bid",
          documentNumber: "001",
        },
      } as { id: string },
      principal,
    );
    for (
      let n = 0;
      n < 100 &&
      service.renders.get(pid, "bidproposal", refusedId)?.state !== "failed";
      n++
    )
      await new Promise((done) => setTimeout(done, 10));
    assert.equal(
      service.renders.get(pid, "bidproposal", refusedId)!.state,
      "failed",
    );
    assert.equal(
      service.documents.get(pid, "bidproposal", "runtime_output_" + refusedId),
      undefined,
    );
    assert.equal(layouts, 1);
    assert.equal(await service.storageBytes(), bytes);
    paidPlan = true;
    service.close();
    service = make(root, principal, "ab".repeat(32), engine, ports);
    await call(service, ["host", "projects", pid]);
    const third = await completed(
      pid,
      "66666666-6666-4666-8666-666666666666",
      "original",
    );
    assert.equal(third, first);
    assert.equal(layouts, 1);
    assert.equal(await service.storageBytes(), bytes);
    limit = -1;
    await completed(pid, "77777777-7777-4777-8777-777777777777", "original", {
      projectName: "Changed project",
      documentName: "Bid",
      documentNumber: "001",
    });
    assert.equal(layouts, 2);
    assert.ok((await service.storageBytes()) > bytes);
    service.close();
    service = make(root, principal, "ab".repeat(32), engine, {
      ...ports,
      layoutCacheVersion: "ef".repeat(32),
    });
    await call(service, ["host", "projects", pid]);
    await completed(pid, "88888888-8888-4888-8888-888888888888", "original");
    assert.equal(layouts, 3);
    const templateA = await service.upload(
      pid,
      "template.docx",
      Buffer.from("synthetic template A"),
      principal,
    );
    const templateB = await service.upload(
      pid,
      "template.docx",
      Buffer.from("synthetic template B"),
      principal,
    );
    await completed(
      pid,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "original",
      undefined,
      { fileId: templateA.id, hash: templateA.hash },
    );
    const templateResult = await completed(
      pid,
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "original",
      undefined,
      { fileId: templateB.id, hash: templateB.hash },
    );
    assert.equal(layouts, 5);
    const repeatedTemplate = await completed(
      pid,
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "original",
      undefined,
      { fileId: templateB.id, hash: templateB.hash },
    );
    assert.equal(repeatedTemplate, templateResult);
    assert.equal(layouts, 5);
    await service.document(pid, "changed_content", {
      markdown: "# Changed manuscript",
      revision: 0,
    });
    await completed(
      pid,
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "changed_content",
    );
    assert.equal(layouts, 6);
    assert.equal(
      service.renders.file(
        pid,
        "bidproposal",
        "44444444-4444-4444-8444-444444444444",
        "pdf",
      ).sha256,
      first,
    );
    assert.equal(service.renders.list(pid, "bidproposal").length, 10);
  } finally {
    service.close();
    rmSync(root, { recursive: true, force: true });
  }
});
