"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Camera barcode scanner using a WebAssembly decoder (ZBar-WASM), NOT the native
 * BarcodeDetector — which silently fails on Safari/iOS and would break every
 * iPhone (CLAUDE.md §6, §16). The WASM decoder is loaded lazily in the browser.
 *
 * Fails loud, never silent: if the camera is unavailable or blocked, we surface
 * a clear message and the caller's manual entry takes over.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    let lastScan = 0;
    let scanImageData: ((d: ImageData) => Promise<Array<{ decode: () => string }>>) | null = null;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setMessage("This device can't open the camera here. Enter the barcode number instead.");
        return;
      }
      try {
        // Lazy-load the WASM decoder (browser only).
        const zbar = await import("@undecaf/zbar-wasm");
        scanImageData = zbar.scanImageData as typeof scanImageData;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        loop();
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Couldn't open the camera. Check permissions, or enter the barcode number.");
      }
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - lastScan < 250) return; // throttle decode work
      lastScan = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !scanImageData || video.readyState < 2) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      scanImageData(imageData)
        .then((symbols) => {
          if (cancelled || !symbols?.length) return;
          const code = symbols[0].decode().trim();
          if (/^\d{6,14}$/.test(code)) {
            cancelled = true;
            cancelAnimationFrame(raf);
            onDetected(code);
          }
        })
        .catch(() => {
          /* a single bad frame is fine — keep scanning */
        });
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden border border-ink bg-ink">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {/* Aiming guide */}
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 border-2 border-red" />
        {status !== "scanning" ? (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-body text-sm text-surface">
            {status === "starting" ? "Opening camera…" : message}
          </p>
        ) : null}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <p className="text-center font-body text-xs text-ink/60">
        Point at the barcode. Good light helps.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
      >
        Cancel
      </button>
    </div>
  );
}
