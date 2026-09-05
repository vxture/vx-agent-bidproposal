import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo } from "./return-to";

test("same-origin relative paths pass through", () => {
  assert.equal(safeReturnTo("/dashboard"), "/dashboard");
  assert.equal(safeReturnTo("/a/b?x=1&y=2"), "/a/b?x=1&y=2");
});

test("open-redirect vectors fall back to /", () => {
  assert.equal(safeReturnTo("//evil.com"), "/");
  assert.equal(safeReturnTo("https://evil.com"), "/");
  assert.equal(safeReturnTo("http://evil.com"), "/");
  assert.equal(safeReturnTo("/\\evil.com"), "/");
  assert.equal(safeReturnTo("/foo\\bar"), "/");
  assert.equal(safeReturnTo("javascript:alert(1)"), "/");
});

test("empty / missing falls back to /", () => {
  assert.equal(safeReturnTo(null), "/");
  assert.equal(safeReturnTo(undefined), "/");
  assert.equal(safeReturnTo(""), "/");
});
