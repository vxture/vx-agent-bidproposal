// Product brand constants - the single source of product identity. Everything
// that names the product (health payload, C2 entitlement lookups, C3 webhook
// product check, Atlas tenant attribution) reads productCode from here, never
// from OIDC_CLIENT_ID: the beta OIDC client is `bidproposal-beta` while the product
// code stays `bidproposal`, so deriving one from the other misidentifies the product
// on any non-prod stack. `scripts/init/rename-product.mjs` rewrites these two
// values when a new product repo is copied from bidproposal.
//
// productCode is PLUMBING (the platform key, owner-registered, rigid);
// displayName is BRAND (what a human sees, exemplar content). They diverge on
// purpose: the code stays `bidproposal`, the product is named Bidproposal - the
// arena is literally a storm of amber embers converging on you. The rename
// script reads the current displayName from this file, so a copy starts as
// its Title-Cased code and takes its own brand from here on.
export const BRAND = {
  productCode: "bidproposal",
  displayName: "Bidproposal",
  defaultLocale: "en",
} as const;

export type Brand = typeof BRAND;
