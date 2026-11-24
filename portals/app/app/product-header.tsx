"use client";
/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Shell
 * @author AI-Generated
 * @date 2026-11-25
 */
import { usePathname } from "next/navigation";
import { BRAND } from "@bidproposal/shared/brand";
import { ShellBrand } from "./ds";
import { SessionControl } from "./session-control";

/** The business workspace resolves identity once and supplies its own chrome. */
export function ProductHeader({ showTemplates }: { showTemplates: boolean }) {
  const path = usePathname();
  if (path === "/") return null;
  return <header className="topnav"><ShellBrand href="/" label={BRAND.displayName} /><nav>
    {showTemplates && <><a href="/challenge">Template sample</a><a href="/chat">Chat</a><a href="/status">Status</a><a href="/platform-check">Platform check</a><a href="/entitlement-matrix">Entitlement matrix</a></>}
    <SessionControl />
  </nav></header>;
}
