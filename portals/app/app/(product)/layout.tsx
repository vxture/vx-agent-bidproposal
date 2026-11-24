import type { ReactNode } from "react";
import { ProductHeader } from "../product-header";
import { isDeployedStage } from "../lib/deploy-stage";

/**
 * The product chrome: everything a signed-in visitor navigates with.
 *
 * It is a route group rather than the root layout so that `/gate` can opt out.
 * A route group does not appear in the URL, so `(product)/page.tsx` is still
 * `/` - the grouping buys the layout boundary and costs nothing in routing.
 *
 * The brand mark is the design system's `ShellBrand`, the same component the
 * gate uses. That matters more than it looks: the mark is the one element a
 * visitor sees on both sides of the checkpoint, so if the two are drawn by
 * different code they drift, and the drift reads as "did I land somewhere
 * else?" at exactly the moment we are asking someone to trust the sign-in.
 */

export const dynamic = "force-dynamic";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <ProductHeader showTemplates={!isDeployedStage()} />
      {children}
    </div>
  );
}
