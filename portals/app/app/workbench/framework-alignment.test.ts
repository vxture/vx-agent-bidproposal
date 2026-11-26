import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectCollection } from "@bidproposal/shared/presentation";
import { ContentWidthProvider } from "@vxture/design-system";
import { headlineFor } from "../../../packages/shared/src/presentation/workspace-headline";
import { sameWorkspace } from "./session-recovery";
import { productFetch, setWorkspaceBlocked } from "./product-fetch";
import type { AccessState } from "../access/types";

test("daily headline stays stable within a local day and visits all ten titles before repeating", () => {
  const dates = Array.from(
    { length: 10 },
    (_, offset) => new Date(2026, 10, 24 + offset, 0, 1),
  );
  const titles = dates.map(headlineFor);
  assert.equal(new Set(titles).size, 10);
  assert.equal(headlineFor(new Date(2026, 10, 24, 23, 59)), titles[0]);
  assert.equal(headlineFor(new Date(2026, 10, 34)), titles[0]);
});

test("recent work contains at most six real cards and does not invent a project owner or progress", () => {
  const projects = Array.from({ length: 8 }, (_, index) => ({
    id: "p" + index,
    name: "Retained " + index,
    productId: "bidproposal",
    createdAt: "2026-11-26T02:00:00Z",
  }));
  const html = renderToStaticMarkup(
    createElement(ContentWidthProvider, {
      children: createElement(ProjectCollection, {
        projects,
        state: "ready",
        catalog: false,
        brand: "Jadera",
        onOpen() {},
        async onCreate() {},
        onCatalog() {},
        onReload() {},
      }),
    }),
  );
  assert.equal((html.match(/jadera-project-card pending/g) || []).length, 6);
  assert.equal(
    (html.match(/\u672a\u6307\u5b9a\u8d1f\u8d23\u4eba/g) || []).length,
    6,
  );
  assert.doesNotMatch(html, />0%</);
});

test("session restoration never admits a different user, organization or workspace", () => {
  const access = {
    status: "authenticated",
    user: { sub: "owner", activeOrg: "org", activeWorkspace: "ws" },
  } as AccessState;
  assert.equal(sameWorkspace(access, access), true);
  for (const patch of [
    { sub: "another" },
    { activeOrg: "another" },
    { activeWorkspace: "another" },
  ]) {
    assert.equal(
      sameWorkspace(access, {
        ...access,
        user: { ...("user" in access ? access.user : {}), ...patch },
      } as AccessState),
      false,
    );
  }
  assert.equal(sameWorkspace(access, { status: "anonymous" }), false);
});

test("blocked product requests never reach fetch and refused writes are never replayed", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("{}", { status: 401 });
  };
  try {
    setWorkspaceBlocked(true);
    await assert.rejects(
      productFetch("/api/workbench/library", { method: "POST" }),
    );
    assert.equal(calls, 0);
    setWorkspaceBlocked(false);
    assert.equal(
      (await productFetch("/api/workbench/library", { method: "POST" })).status,
      401,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    setWorkspaceBlocked(false);
  }
});

test("the existing Web frame stops after refusal and only its same-origin parent can restore requests", async () => {
  // The browser adapter is maintained JavaScript, bundled into the product frame.
  const { createRuntime } = await import("../../workbench/environment.mjs");
  const originalWindow = globalThis.window;
  const parent = {
    postMessage() {
      notices++;
    },
  };
  const listeners = new Map<
    string,
    (event: { source: unknown; origin: string; data: unknown }) => void
  >();
  let calls = 0,
    notices = 0;
  globalThis.window = {
    parent,
    addEventListener: (
      name: string,
      listener: (event: {
        source: unknown;
        origin: string;
        data: unknown;
      }) => void,
    ) => listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
  } as unknown as Window & typeof globalThis;
  const runtime = createRuntime({
    href: "https://jadera.ruyin.work/workbench/index.html?project=prj_e9969cf830e74eac8f3d3486bb3fdbda",
    // @ts-expect-error The adapter requires publish at runtime; JS optional-object inference omits it.
    publish() {},
    fetcher: async () => {
      calls++;
      return new Response(JSON.stringify({ message: "Sign in" }), {
        status: calls === 1 ? 401 : 200,
      });
    },
  });
  try {
    assert.equal((await runtime.request("POST", "/jobs", {})).status, 401);
    assert.equal(notices, 1);
    await assert.rejects(runtime.request("POST", "/jobs", {}));
    const receive = listeners.get("message")!;
    receive({
      source: parent,
      origin: "https://foreign.example",
      data: { ns: "bid.access", blocked: false },
    });
    await assert.rejects(runtime.request("POST", "/jobs", {}));
    assert.equal(calls, 1);
    receive({
      source: parent,
      origin: "https://jadera.ruyin.work",
      data: { ns: "bid.access", blocked: false },
    });
    assert.equal((await runtime.request("GET", "/jobs")).status, 200);
    assert.equal(calls, 2);
  } finally {
    runtime.close();
    globalThis.window = originalWindow;
  }
});
