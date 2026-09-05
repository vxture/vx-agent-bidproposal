import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND } from "@bid/shared/brand";

// The product contract, served to the runtime.
//
// ruyin fetches `GET /products/:product/contract` (vxture-ruyin
// apps/local-host/src/contract-fetch.ts) with `accept: application/yaml,
// application/json`, keeps a local copy, and falls back to that copy on 404 or
// any outage - so serving this is what lets the runtime pick up a new contract
// without a ruyin release, and NOT serving it is never fatal to a user.
//
// The file is the product's own `ruyin.product.yaml`. It is the same file
// vxture-ruyin ships as its test fixture (products/bid/); this repo is the
// authority for it from now on (ruyin TD-006: no product code lives in ruyin).

/** The product id as ruyin knows it (contract `product.id`), distinct from the platform product code. */
export const CONTRACT_PRODUCT_ID = "vxture.bid";

const CONTRACT_PATH = join(process.cwd(), "contract", "ruyin.product.yaml");

let cached: { text: string; etag: string } | null = null;

export function loadContract(): { text: string; etag: string } {
  if (cached) return cached;
  const text = readFileSync(CONTRACT_PATH, "utf8");
  // Weak validator over the bytes: enough for If-None-Match, cheap to compute.
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  cached = { text, etag: `W/"${(h >>> 0).toString(16)}-${text.length}"` };
  return cached;
}

/** Does this path's product segment name us? ruyin addresses by contract `product.id`. */
export function isOurProduct(segment: string): boolean {
  return segment === CONTRACT_PRODUCT_ID || segment === BRAND.productCode;
}
