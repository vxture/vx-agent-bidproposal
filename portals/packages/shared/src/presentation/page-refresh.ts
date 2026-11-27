"use client";
import { useEffect, useRef } from "react";
const REFRESH = "jadera:refresh-page",
  BEFORE = "jadera:before-refresh";
interface RefreshDetail {
  waitUntil(promise: Promise<unknown>): void;
}
let active: Promise<boolean> | undefined;
export function refreshCurrentPage(): Promise<boolean> {
  if (active) return active;
  if (!window.dispatchEvent(new Event(BEFORE, { cancelable: true })))
    return Promise.resolve(false);
  const pending: Promise<unknown>[] = [];
  window.dispatchEvent(
    new CustomEvent<RefreshDetail>(REFRESH, {
      detail: { waitUntil: (promise) => pending.push(promise) },
    }),
  );
  active = Promise.allSettled(pending)
    .then((results) => {
      const error = results.find((result) => result.status === "rejected");
      if (error?.status === "rejected") throw error.reason;
      return true;
    })
    .finally(() => {
      active = undefined;
    });
  return active;
}
export function usePageRefresh(load: () => unknown | Promise<unknown>) {
  const latest = useRef(load);
  latest.current = load;
  useEffect(() => {
    const refresh = (event: Event) =>
      (event as CustomEvent<RefreshDetail>).detail.waitUntil(
        Promise.resolve().then(() => latest.current()),
      );
    window.addEventListener(REFRESH, refresh);
    return () => window.removeEventListener(REFRESH, refresh);
  }, []);
}
export function useRefreshGuard(blocked: boolean, onBlocked?: () => void) {
  const latest = useRef({ blocked, onBlocked });
  latest.current = { blocked, onBlocked };
  useEffect(() => {
    const guard = (event: Event) => {
      if (latest.current.blocked) {
        event.preventDefault();
        latest.current.onBlocked?.();
      }
    };
    window.addEventListener(BEFORE, guard);
    return () => window.removeEventListener(BEFORE, guard);
  }, []);
}
