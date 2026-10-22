import { useEffect, useRef } from "react";

/**
 * Scroll (and focus) an error banner into view when an error appears. Fixes a
 * real journey bug: on long forms the alert renders at the top but the submit
 * button is at the bottom, so a failed submit looked like nothing happened.
 * Attach the returned ref to the alert element (give it tabIndex={-1}). Honors
 * prefers-reduced-motion. Defensive — safe when the element isn't mounted.
 */
export function useScrollToError<T>(error: T | null | undefined) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!error || !ref.current) return;
    let smooth = true;
    try {
      smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* default to smooth */
    }
    try {
      ref.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
      ref.current.focus({ preventScroll: true });
    } catch {
      /* ignore — scrolling/focus is best-effort */
    }
  }, [error]);
  return ref;
}
