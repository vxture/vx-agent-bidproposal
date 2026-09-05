import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifySignature, parseSignatureHeader } from "./verify";

const NOW = 1_700_000_000;
const SECRET = "whsec_current";
const NEXT = "whsec_next";
const BODY = '{"id":"d1","type":"tenant.provisioned","seq":1}';

function sign(secret: string, t: number, body: string): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

test("accepts a correct signature within the time window", () => {
  assert.equal(verifySignature(BODY, sign(SECRET, NOW, BODY), [SECRET], NOW), true);
});

test("rejects a wrong secret / tampered body", () => {
  assert.equal(verifySignature(BODY, sign("wrong", NOW, BODY), [SECRET], NOW), false);
  assert.equal(verifySignature(BODY + "x", sign(SECRET, NOW, BODY), [SECRET], NOW), false);
});

test("rejects a timestamp outside +/-300s (replay)", () => {
  assert.equal(verifySignature(BODY, sign(SECRET, NOW - 400, BODY), [SECRET], NOW), false);
  assert.equal(verifySignature(BODY, sign(SECRET, NOW + 400, BODY), [SECRET], NOW), false);
});

test("rotation: a signature from the NEXT secret verifies against [current,next]", () => {
  assert.equal(verifySignature(BODY, sign(NEXT, NOW, BODY), [SECRET, NEXT], NOW), true);
});

test("rejects a missing / malformed header", () => {
  assert.equal(verifySignature(BODY, null, [SECRET], NOW), false);
  assert.equal(verifySignature(BODY, "garbage", [SECRET], NOW), false);
  assert.equal(parseSignatureHeader("t=1"), null); // no v1
});
