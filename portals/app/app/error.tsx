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

/** Never expose server errors or request details in the public fallback. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <EntryShell><EntryCard kind="error" onAction={reset} /></EntryShell>;
}
