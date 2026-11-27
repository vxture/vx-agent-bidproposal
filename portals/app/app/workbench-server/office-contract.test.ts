import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT, jwtVerify } from "jose";
import { officeConfig, verifiedOfficeCallback } from "./office-contract";
const secret = "test-only-office-key-".repeat(3);
test("office config preserves mode and keys immutable versions separately", async () => {
  const input = { id: "resource", version: 1, hash: "abc", name: "template.docx", downloadUrl: "https://product.test/signed-file", callbackUrl: "https://product.test/save", user: { id: "user", name: "Member" }, editable: false };
  const config = await officeConfig(input, secret);
  assert.equal(config.document.permissions.edit, false);
  assert.equal(config.editorConfig.mode, "view");
  assert.notEqual(config.document.key, (await officeConfig({ ...input, version: 2 }, secret)).document.key);
  const verified = await jwtVerify(config.token, new TextEncoder().encode(secret));
  assert.deepEqual(verified.payload.document, config.document);
});
test("callback rejects forged signatures and foreign saved document origins", async () => {
  const sign = (url: string) => new SignJWT({ status: 2, url }).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode(secret));
  const token = await sign("https://office.test/cache/document.docx");
  assert.equal((await verifiedOfficeCallback(token, secret, "https://office.test")).status, 2);
  await assert.rejects(verifiedOfficeCallback(token, "wrong-key", "https://office.test"));
  await assert.rejects(verifiedOfficeCallback(await sign("http://169.254.169.254/metadata"), secret, "https://office.test"));
});
