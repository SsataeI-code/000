"use client";

import { useEffect, useState } from "react";
import { savePushSubscriptionAction, removePushSubscriptionAction } from "@/lib/push/actions";

type Status = "loading" | "unsupported" | "unconfigured" | "off" | "on" | "denied" | "busy";

/** base64url VAPID public key → Uint8Array for PushManager.subscribe. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Turn phone/desktop push on or off (§10). Registers the service worker, asks
 * permission, subscribes, and stores the subscription. Honest about support:
 * shows a clear state instead of failing silently (iOS only allows push once the
 * app is added to the Home Screen — messaged inline).
 */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!publicKey) return setStatus("unconfigured");
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return setStatus("unsupported");
    }
    if (Notification.permission === "denied") return setStatus("denied");
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("unsupported");
      }
    })();
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setStatus("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setStatus(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
      const res = await savePushSubscriptionAction(JSON.stringify(sub));
      setStatus(res.ok ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
    } catch {
      /* ignore */
    }
    setStatus("off");
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Push notifications</p>
          <p className="mt-1 font-body text-sm text-ink/70">{message(status)}</p>
        </div>
        {status === "off" ? (
          <button type="button" onClick={enable} className="min-h-tap shrink-0 bg-red px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink">
            Turn on
          </button>
        ) : status === "on" ? (
          <button type="button" onClick={disable} className="min-h-tap shrink-0 border border-hairline px-4 py-2 font-label text-xs uppercase tracking-wide text-ink/70 hover:border-red hover:text-red">
            Turn off
          </button>
        ) : status === "busy" || status === "loading" ? (
          <span className="shrink-0 font-label text-[10px] uppercase tracking-wide text-ink/40">…</span>
        ) : null}
      </div>
    </section>
  );
}

function message(s: Status): string {
  switch (s) {
    case "on": return "On — nudges and messages will buzz this device.";
    case "off": return "Get a buzz when your coach messages or a nudge lands.";
    case "denied": return "Blocked in your browser settings. Re-allow notifications for this site to turn it on.";
    case "unsupported": return "This browser can't do push. On iPhone, add the app to your Home Screen first, then try here.";
    case "unconfigured": return "Push isn't set up on this app yet.";
    default: return "Checking…";
  }
}
