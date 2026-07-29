"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnswerHelper } from "@/components/help/AnswerHelper";
import { getHelpContextAction } from "@/lib/help/actions";
import type { HelpContext } from "@/lib/help/answer";
import { IconMessages } from "@/components/icons";

// Screens where the floating launcher would be redundant (the Ask page already
// shows the helper) or a distraction (the focused onboarding flow).
const HIDDEN_ON = ["/client/assistant", "/client/onboarding"];

/**
 * Floating "answer helper" launcher — present on every client screen (a quick,
 * always-there line to instant answers from their own numbers). It loads its
 * context only when opened (via a server action), so a normal page load never
 * pays for the fetch, and refetches on each open so the numbers stay live.
 */
export function HelpLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<HelpContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getHelpContextAction()
      .then((res) => {
        if (res.error) setError(res.error);
        else setCtx(res.ctx ?? null);
      })
      .catch(() => setError("Couldn't load your numbers just now — try again in a moment."))
      .finally(() => setLoading(false));
  }, []);

  function openDrawer() {
    setOpen(true);
    load(); // fresh numbers every time it opens
  }
  const closeDrawer = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  // Escape closes; focus the close button on open; Tab is trapped inside the
  // dialog so keyboard/screen-reader users can't wander behind the modal.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDrawer]);

  // Close the drawer on any navigation (e.g. the in-helper "Message your coach"
  // link), so it never lingers over the page the user just moved to.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Not shown on screens where it would be redundant or distracting.
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <>
      {/* Floating launcher — clears the mobile tab bar, hidden while the drawer is open. */}
      {!open ? (
        <button
          ref={openerRef}
          type="button"
          onClick={openDrawer}
          aria-label="Ask the helper"
          aria-haspopup="dialog"
          className="fixed bottom-20 right-4 z-40 inline-flex min-h-tap items-center gap-2 bg-red px-4 py-3 font-label text-xs font-600 uppercase tracking-wide text-white shadow-lg hover:bg-red-ink md:bottom-6"
        >
          <span aria-hidden className="h-5 w-5"><IconMessages /></span>
          Ask
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close helper"
            tabIndex={-1}
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quick answers"
            className="animate-stagger-in absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-[560px] flex-col gap-4 border-t border-hairline bg-surface p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-label text-xs uppercase tracking-wide text-ink/50">Quick answers</p>
                <h2 className="mt-1 text-2xl text-ink">Ask</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Close"
                className="min-h-tap min-w-tap font-label text-sm uppercase tracking-wide text-ink/60 hover:text-red"
              >
                Close
              </button>
            </div>

            {loading && !ctx ? (
              <p className="py-8 text-center font-body text-sm text-ink/50">Loading your numbers…</p>
            ) : error && !ctx ? (
              <div className="flex flex-col gap-3 py-6 text-center">
                <p className="font-body text-sm text-red-ink">{error}</p>
                <button
                  type="button"
                  onClick={load}
                  className="min-h-tap self-center border border-hairline px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red"
                >
                  Try again
                </button>
              </div>
            ) : ctx ? (
              <AnswerHelper ctx={ctx} />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
