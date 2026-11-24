"use client";

/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Entry
 * @author AI-Generated
 * @date 2026-11-24
 */
import { EntryCard } from "./access/entry-card";
import { EntryShell } from "./access/entry-shell";

export default function NotFound() {
  return <EntryShell><EntryCard kind="not-found" actionHref="/" /></EntryShell>;
}
