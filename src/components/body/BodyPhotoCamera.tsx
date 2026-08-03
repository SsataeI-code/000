"use client";

import { useEffect, useRef, useState } from "react";

const TIMER_OPTIONS = [0, 3, 10] as const;

/**
 * In-app camera with a self-timer for progress photos (§C) — so a client can
 * prop the phone up, start a 3s/10s countdown, step back, and pose. Captures a
 * frame to a JPEG blob and hands it to the caller to upload. Fails loud: if the
 * camera can't open, it says so and the file picker still works.
 */
export function BodyPhotoCamera({ onCapture, onClose }: { onCapture: (blob: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [message, setMessage] = useState("");
  const [timerSec, setTimerSec] = useState<number>(3);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setMessage("Camera isn't available here. Use “Add a photo” to pick one instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Couldn't open the camera. Check permissions, or use “Add a photo”.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      if (countdownRef.current) clearInterval(countdownRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function snap() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    c.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  function startCapture() {
    if (status !== "ready" || countdown !== null) return;
    if (timerSec <= 0) {
      snap();
      return;
    }
    let n = timerSec;
    setCountdown(n);
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        snap();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden border border-hairline bg-elevated">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {status !== "ready" ? (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-body text-sm text-white">
            {status === "starting" ? "Opening camera…" : message}
          </p>
        ) : null}
        {countdown !== null ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="font-display text-8xl text-white">{countdown}</span>
          </div>
        ) : null}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Timer selector */}
      <div className="flex items-center justify-center gap-2">
        <span className="font-label text-[10px] uppercase tracking-wide text-ink/50">Timer</span>
        {TIMER_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTimerSec(t)}
            aria-pressed={timerSec === t}
            className={`min-h-tap min-w-[44px] border px-3 py-2 font-label text-xs uppercase tracking-wide ${
              timerSec === t ? "border-red bg-red text-white" : "border-hairline text-ink hover:border-red"
            }`}
          >
            {t === 0 ? "Off" : `${t}s`}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={startCapture}
          disabled={status !== "ready" || countdown !== null}
          className="min-h-tap bg-red px-6 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
        >
          {countdown !== null ? "Get ready…" : timerSec > 0 ? `Start ${timerSec}s timer` : "Capture"}
        </button>
      </div>
    </div>
  );
}
