import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { makePkce, randomToken } from "./pkce";

test("makePkce challenge is base64url(sha256(verifier))", () => {
  const { verifier, challenge } = makePkce();
  const expected = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(challenge, expected);
  // base64url: no +, /, or = padding
  assert.match(challenge, /^[A-Za-z0-9_-]+$/);
  assert.match(verifier, /^[A-Za-z0-9_-]+$/);
});

test("randomToken is unique and url-safe", () => {
  const a = randomToken();
  const b = randomToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});
