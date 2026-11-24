import type { ReactNode } from "react";

/** The shared project application owns its product-specific chrome. */
export default function ProductLayout({children}: {children: ReactNode}) { return children; }
export const dynamic = "force-dynamic";
