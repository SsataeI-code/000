"use client";

import { useEffect, useState } from "react";

/**
 * "Install this app" prompt (free-route polish — make the PWA feel official so
 * clients add it to their home screen instead of leaving it in a browser tab).
 * Platform-aware and honest:
 *  - already installed (standalone) → nothing.
 *  - Android/desktop Chrome → fires the real native install via beforeinstallprompt.
 *  - iOS Safari (no native prompt) → shows the Share → Add to Home Screen steps.
 * Dismissible and remembered per device so it never nags. House style; no emoji.
 */

const DISMISS_KEY = "tff-install-dismissed";

type Platform = "ios" | "android" | "other";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    // Already running as an installed app → never show.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* storage blocked — just show it */
    }

    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !/windows phone/i.test(ua);

    if (isIOS) {
      setPlatform("ios");
      setShow(true);
      return;
    }

    // Android / desktop Chrome: wait for the browser's install signal.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setPlatform("android");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    const onInstalled = () => dismiss();
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    setIosOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-grad-elevated p-3 text-white shadow-card">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grad-red text-white shadow-glow">
          <PhoneDownIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-label text-sm uppercase tracking-wide text-white">Install this app</p>
          <p className="font-body text-sm text-white/70">Add it to your home screen — opens full-screen, like a real app.</p>
        </div>
        {platform === "android" ? (
          <button
            type="button"
            onClick={install}
            className="min-h-tap shrink-0 rounded-xl bg-grad-red px-4 py-2 font-label text-sm uppercase tracking-wide text-white shadow-pop-red transition-transform active:translate-y-[3px]"
          >
            Install
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIosOpen((v) => !v)}
            aria-expanded={iosOpen}
            className="min-h-tap shrink-0 rounded-xl bg-grad-red px-4 py-2 font-label text-sm uppercase tracking-wide text-white shadow-pop-red transition-transform active:translate-y-[3px]"
          >
            How
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="min-h-tap shrink-0 px-1 font-label text-lg leading-none text-white/50 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* iOS steps — no native install API on iPhone, so show the real taps. */}
      {platform === "ios" && iosOpen ? (
        <ol className="mt-3 flex flex-col gap-1.5 border-t border-white/10 pt-3 font-body text-sm text-white/80">
          <li className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 font-label text-[12px]">1</span>
            Tap the <ShareIcon /> <span className="font-600">Share</span> button in Safari&apos;s toolbar.
          </li>
          <li className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 font-label text-[12px]">2</span>
            Scroll down and tap <span className="font-600">Add to Home Screen</span>.
          </li>
          <li className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 font-label text-[12px]">3</span>
            Tap <span className="font-600">Add</span> — the icon lands on your home screen.
          </li>
        </ol>
      ) : null}
    </div>
  );
}

function PhoneDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v6m0 0 2.3-2.3M12 13.5l-2.3-2.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="inline-block align-text-bottom">
      <path d="M12 3v12m0-12L8.5 6.5M12 3l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
