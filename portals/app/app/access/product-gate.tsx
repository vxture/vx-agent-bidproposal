"use client";

/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Entry
 * @author AI-Generated
 * @date 2026-11-24
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { safeReturnTo } from "../auth/lib/return-to";
import { readAccess } from "./access-reader";
import { EntryCard } from "./entry-card";
import { entryKindFor, gateLoginUrl, type EntryKind } from "./entry-content";
import { EntryShell } from "./entry-shell";
import { isThrough, type AccessState } from "./types";

type Phase = { kind: "checking" } | { kind: "resolved"; state: AccessState } | { kind: "failed" };

/** One authority read for session, workspace, subscription and assignment. */
export function ProductGate({ destination }: Readonly<{ destination: string }>) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const generation = useRef(0);
  const redirected = useRef(false);
  const target = safeReturnTo(destination);
  const check = useCallback(() => {
    const current = ++generation.current;
    setPhase({ kind: "checking" });
    void readAccess().then(state => {
      if (generation.current !== current) return;
      if (isThrough(state)) {
        if (!redirected.current) {
          redirected.current = true;
          window.location.replace(target.split(/[?#]/)[0] === "/gate" ? "/" : target);
        }
        return;
      }
      setPhase({ kind: "resolved", state });
    }).catch(() => {
      if (generation.current === current) setPhase({ kind: "failed" });
    });
  }, [target]);

  useEffect(() => {
    check();
    return () => { ++generation.current; };
  }, [check]);

  let kind: EntryKind = "checking";
  if (phase.kind === "failed") kind = "access-unavailable";
  if (phase.kind === "resolved") kind = entryKindFor(phase.state);
  const user = phase.kind === "resolved" && "user" in phase.state ? phase.state.user : undefined;
  return <EntryShell><EntryCard kind={kind} user={user}
    actionHref={kind === "signin" ? gateLoginUrl(target) : undefined}
    onAction={kind === "signin" ? undefined : check} /></EntryShell>;
}
