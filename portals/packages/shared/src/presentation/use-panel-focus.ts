"use client";
import { useEffect, useRef } from "react";

/** A drawer owns focus while open and restores the original trigger on close. */
export function usePanelFocus(open: boolean, drawer: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open || !drawer || !ref.current) return;
    const panel = ref.current;
    const previous = document.activeElement;
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
    )).filter(element => element.getClientRects().length > 0);
    (focusable()[0] || panel).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const elements = focusable(), first = elements[0], last = elements.at(-1);
        if (!first) { event.preventDefault(); panel.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    panel.addEventListener("keydown", keydown);
    return () => {
      panel.removeEventListener("keydown", keydown);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open, drawer]);
  return ref;
}
