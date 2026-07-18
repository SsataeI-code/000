"use client";

import { useEffect } from "react";

/**
 * Root error boundary — catches failures in the root layout itself (where the
 * normal error.tsx can't reach), so even a total failure renders a branded,
 * self-contained page instead of a raw platform crash. Must render its own
 * <html>/<body>. Styles are inline because the layout (and its CSS) may be what
 * failed.
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "3rem 1.5rem",
          maxWidth: "440px",
          marginInline: "auto",
          background: "#f6f6f4",
          color: "#0c0c0d",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#e10600",
            margin: 0,
          }}
        >
          Something hiccuped
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
          We&apos;ll get you back on track.
        </h1>
        <p style={{ color: "rgba(12,12,13,0.7)", margin: 0 }}>
          That&apos;s on us, not you. Give it another try — your data is safe.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: "44px",
            border: "none",
            background: "#e10600",
            color: "#fff",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            fontWeight: 600,
            padding: "0.75rem 1.25rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest ? (
          <p style={{ fontSize: "0.625rem", textTransform: "uppercase", color: "rgba(12,12,13,0.4)", margin: 0 }}>
            Ref: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
