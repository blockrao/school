"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by src/app/layout.tsx itself (the root layout — fonts,
 * not data). Must render its own <html>/<body>: this replaces the root layout
 * entirely when it fires, so none of the app's normal styles/fonts are
 * guaranteed to be available — kept deliberately plain, inline-styled, no
 * Tailwind classes to depend on. See src/app/error.tsx for the far more common
 * case (everything below the root layout) and its own note on why neither
 * error boundary existed before 2026-09-28.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem" }}>
        <div
          style={{
            maxWidth: "32rem",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>SchoolOye</h1>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: "#555" }}>This page couldn't load. Try again in a moment.</p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                height: "2.75rem",
                padding: "0 1.25rem",
                borderRadius: "0.375rem",
                background: "#2a5dab",
                color: "#fff",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                height: "2.75rem",
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                color: "#2a5dab",
              }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
