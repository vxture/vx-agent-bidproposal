"use client";

/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Entry
 * @author AI-Generated
 * @date 2026-11-24
 */
import { ArrowRight, ShieldCheck, SpinnerGap, User } from "@phosphor-icons/react";
import { Button } from "../ds";
import { displayNameFor } from "../auth/lib/display";
import type { AccessUser } from "./types";
import { ENTRY_COPY, type EntryKind } from "./entry-content";
import { useEntryLocale } from "./entry-shell";

// --- Quiet, document-specific illustration ---------------------------------

function DocumentStatus({ kind }: Readonly<{ kind: EntryKind }>) {
  if (["subscription", "unassigned", "restricted", "inactive"].includes(kind)) {
    return <><rect x="185" y="107" width="13" height="11" rx="2" /><path d="M187 107v-4a4.5 4.5 0 0 1 9 0v4" /></>;
  }
  if (kind === "expired") return <><circle cx="191.5" cy="109.5" r="8" /><path d="M192 104v6l4 2" /></>;
  if (kind === "checking") return <path d="M198 109a7 7 0 1 0-3 6m3-12v6h-6" />;
  if (kind === "signin") return <path d="M184 110h14m-5-5 5 5-5 5" />;
  return <><path d="M192 103v8" /><circle cx="192" cy="116" r=".5" /></>;
}

function DocumentMotif({ kind }: Readonly<{ kind: EntryKind }>) {
  return <svg className="bid-entry-art" viewBox="0 0 280 155" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
      <path opacity=".18" d="M40 120h200M55 131h170M70 142h140" />
      <rect x="87" y="23" width="100" height="116" rx="7" fill="var(--background)" opacity=".25" transform="rotate(-9 137 81)" />
      <rect x="99" y="16" width="100" height="116" rx="7" fill="var(--background)" opacity=".5" transform="rotate(5 149 74)" />
      <path d="M105 15a7 7 0 0 1 7-7h57l29 29v82a7 7 0 0 1-7 7h-79a7 7 0 0 1-7-7Z" fill="var(--background)" />
      <path d="M169 8v22a7 7 0 0 0 7 7h22" />
      <path opacity=".55" strokeLinecap="round" d="M122 49h35M122 63h58M122 77h58M122 91h37M122 105h28" />
      <rect x="173" y="91" width="37" height="37" rx="11" fill="var(--background)" />
      <g strokeWidth="1.7" strokeLinecap="round">
        <DocumentStatus kind={kind} />
      </g>
    </g>
  </svg>;
}

// --- Identity and bottom-aligned actions ------------------------------------

export function EntryCard({ kind, user, actionHref, onAction }: Readonly<{
  kind: EntryKind; user?: AccessUser; actionHref?: string; onAction?: () => void;
}>) {
  const locale = useEntryLocale();
  const zh = locale === "zh-CN";
  const copy = ENTRY_COPY[locale][kind];
  const pending = kind === "checking";
  const currentAccount = zh ? "\u5f53\u524d\u8d26\u53f7" : "Current account";
  const unifiedAccount = zh ? "\u5168\u5c40\u7edf\u4e00\u8d26\u53f7" : "One platform account";
  const name = user ? displayNameFor(user, currentAccount) : unifiedAccount;
  const org = typeof user?.activeOrgName === "string" ? user.activeOrgName.trim() : "";
  const workspace = typeof user?.activeWorkspaceName === "string" ? user.activeWorkspaceName.trim() : "";
  const signedIn = zh ? "\u5df2\u767b\u5f55\u5e73\u53f0\u8d26\u53f7" : "Signed in to the platform";
  const unifiedNote = zh ? "\u8d26\u53f7\u3001\u5355\u4f4d\u4e0e\u5de5\u4f5c\u7a7a\u95f4\uff0c\u4e00\u5904\u8fde\u63a5" : "Your account, organization and workspace, connected";
  const identityNote = user ? org || workspace || signedIn : unifiedNote;
  return <section className="bid-entry-card" aria-labelledby="bid-entry-title" aria-busy={pending}>
    <header className="bid-entry-heading" aria-live="polite" aria-atomic="true">
      <p>WELCOME TO BIDPROPOSAL</p>
      <h1 id="bid-entry-title" tabIndex={-1}>{copy.title}</h1>
    </header>
    <div className="bid-entry-art-position"><DocumentMotif kind={kind} /></div>
    <div className="bid-entry-core">
      {kind !== "not-found" && kind !== "error" && <div className="bid-entry-identity" aria-label={zh ? "\u8d26\u53f7\u4e0e\u7ec4\u7ec7" : "Account and organization"}>
        <User size={24} aria-hidden="true" />
        <div><strong title={name}>{name}</strong><span title={identityNote}>{identityNote}</span></div>
      </div>}
      <div className="bid-entry-actions">
        {actionHref ? <Button asChild className="bid-entry-action"><a href={actionHref}>{copy.action}
          {kind === "signin" && <ArrowRight size={16} aria-hidden="true" />}</a></Button> :
          <Button type="button" className="bid-entry-action" disabled={pending || !onAction} onClick={onAction}>
            {pending && <SpinnerGap className="bid-entry-spinner" size={18} aria-hidden="true" />}{copy.action}
          </Button>}
      </div>
    </div>
    <footer className="bid-entry-note">
      {(kind === "signin" || pending) && <ShieldCheck size={16} aria-hidden="true" />}
      <span>{copy.note}</span>
    </footer>
  </section>;
}
