"use client";
import { useEffect, useState } from "react";

/** Resolve after hydration, then react only when the breakpoint changes. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>();
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
