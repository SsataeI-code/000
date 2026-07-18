"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. A crash should never show a raw platform error to
 * a client (reliability + polish are tied-#1, CLAUDE.md §2). This is warm,
 * on-brand, and always offers a way forward — nothing is ever a dead end (§5).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center gap-6 px-6 py-12">
      <p className="font-label text-xs uppercase tracking-wide text-red">
        Something hiccuped
      </p>
      <h1 className="text-4xl text-ink">We&apos;ll get you back on track.</h1>
      <p className="font-body text-ink/70">
        That&apos;s on us, not you. Give it another try — your data is safe.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-tap items-center justify-center bg-red px-5 py-3 font-label text-sm font-600 uppercase tracking-wide text-surface hover:bg-red-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-center font-body text-sm text-ink/70 underline underline-offset-4 hover:text-red"
        >
          Back to start
        </Link>
      </div>
      {error.digest ? (
        <p className="font-label text-[10px] uppercase tracking-wide text-ink/40">
          Ref: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
