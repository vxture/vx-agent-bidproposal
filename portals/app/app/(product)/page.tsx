import { BRAND } from "@bidproposal/shared/brand";

/** The Web entry stays honest until the Web business workspace ships. */
export default function ProductPage() {
  return (
    <main style={{ maxWidth: "48rem", margin: "4rem auto", paddingInline: "1.5rem" }}>
      <h1>{BRAND.displayName}</h1>
      <p>{"\u6807\u4e66\u65b9\u6848\u667a\u80fd\u4f53"}</p>
      <p>{"\u7f51\u9875\u5de5\u4f5c\u53f0\u6b63\u5728\u51c6\u5907\u4e2d\u3002"}</p>
    </main>
  );
}
