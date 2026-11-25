/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Brand
 * @author AI-Generated
 * @date 2026-11-25
 */
import { BRAND } from "@bidproposal/shared/brand";
import { ProductMark } from "./product-mark";
import "./product-identity.css";

/** Shared product title; the descriptor has the same size as the short name. */
export function ProductIdentity() {
  return <span className="bid-product-identity" title={BRAND.fullName}>
    <ProductMark size={32} />
    <span className="bid-product-short-name">{BRAND.chineseName}</span>
    <span className="bid-product-descriptor">{BRAND.descriptor}</span>
  </span>;
}
