import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTRACT_PRODUCT_ID, isOurProduct, loadContract } from "./contract";

// The contract endpoint is what lets ruyin pick up a new `ruyin.product.yaml`
// without a ruyin release. What matters here: the file ships and parses as the
// bid contract, and the path segment ruyin uses (`product.id`) is recognised.

test("loadContract: serves the bid contract with a stable validator", () => {
  const a = loadContract();
  assert.match(a.text, /^﻿?# Bid product runtime contract/);
  assert.match(a.text, /id: vxture\.bid/);
  assert.match(a.etag, /^W\/"[0-9a-f]+-\d+"$/);
  // Cached: the same bytes give the same tag.
  assert.equal(loadContract().etag, a.etag);
});

test("isOurProduct: ruyin addresses by contract product.id; the platform code is accepted too", () => {
  assert.equal(CONTRACT_PRODUCT_ID, "vxture.bid");
  assert.equal(isOurProduct("vxture.bid"), true);
  assert.equal(isOurProduct("bid"), true);
  assert.equal(isOurProduct("vxture.other"), false);
});
