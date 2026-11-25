// Product brand constants - the single source of product identity. Everything
// that names the product (health payload, C2 entitlement lookups, C3 webhook
// product check, Atlas tenant attribution) reads productCode from here, never
// from OIDC_CLIENT_ID: the beta OIDC client is `bidproposal-beta` while the product
// code stays `bidproposal`, so deriving one from the other misidentifies the product
// on any non-prod stack. `scripts/init/rename-product.mjs` rewrites these two
// values when a new product repo is copied from bidproposal.
//
// Jadera is the current brand and requested target code. The registered
// productCode is temporarily retained until the platform supports an in-place
// code migration preserving the existing product ID, plans and subscriptions.
// Do not silently use the new code against an unchanged commercial catalog.
export const BRAND = {
  productCode: "bidproposal",
  targetProductCode: "jadera",
  displayName: "Jadera",
  chineseName: "\u745c\u7ae0",
  descriptor: "\u6807\u4e66\u667a\u80fd\u4f53",
  fullName: "\u745c\u7ae0 \u00b7 \u6295\u6807\u65b9\u6848\u667a\u80fd\u4f53",
  origin: "https://jadera.ruyin.work",
  logo: "/brand/jadera-logo.svg",
  defaultLocale: "zh-CN",
} as const;

export type Brand = typeof BRAND;
