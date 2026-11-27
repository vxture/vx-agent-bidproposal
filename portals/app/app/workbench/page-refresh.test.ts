import test from "node:test";
import assert from "node:assert/strict";
import { refreshCurrentPage } from "../../../packages/shared/src/presentation/page-refresh";

test("content refresh waits for active page reads, deduplicates clicks and respects draft guards", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window"),
    target = new EventTarget();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: target,
  });
  try {
    let calls = 0,
      finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const load = (event: Event) => {
      calls++;
      (
        event as CustomEvent<{ waitUntil(promise: Promise<void>): void }>
      ).detail.waitUntil(pending);
    };
    target.addEventListener("jadera:refresh-page", load);
    const first = refreshCurrentPage(),
      second = refreshCurrentPage();
    assert.equal(first, second);
    assert.equal(calls, 1);
    let completed = false;
    void first.then(() => {
      completed = true;
    });
    await Promise.resolve();
    assert.equal(completed, false);
    finish();
    assert.equal(await first, true);
    const guard = (event: Event) => event.preventDefault();
    target.addEventListener("jadera:before-refresh", guard);
    assert.equal(await refreshCurrentPage(), false);
    assert.equal(calls, 1);
    target.removeEventListener("jadera:before-refresh", guard);
    target.removeEventListener("jadera:refresh-page", load);
    target.addEventListener(
      "jadera:refresh-page",
      (event) =>
        (
          event as CustomEvent<{ waitUntil(promise: Promise<void>): void }>
        ).detail.waitUntil(Promise.reject(Error("Unavailable"))),
      { once: true },
    );
    await assert.rejects(refreshCurrentPage(), /Unavailable/);
    assert.equal(
      await refreshCurrentPage(),
      true,
      "a later manual retry is allowed",
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
