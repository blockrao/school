"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by src/app/[locale]/layout.tsx (its listLaunchedCityOptions()
 * Supabase read) and everything nested under it — every page, every locale. Before this
 * file existed there was NO error boundary anywhere in the app (confirmed 2026-09-28:
 * no error.tsx, global-error.tsx, or not-found.tsx existed at all), so any transient
 * data-fetch failure (a Supabase timeout, a connection hiccup) rendered Next's bare
 * default error UI — no header, no footer, easy to read as a "blank page" — instead of
 * a page that explains what happened and offers a retry.
 *
 * Deliberately self-contained (no SiteHeader/SiteFooter): this boundary can fire
 * precisely because the data those components need failed to load, so it can't safely
 * depend on that same data. src/app/global-error.tsx is the one level further out,
 * for the rare case the root layout itself (fonts, not data) fails.
 */
export default function LocaleTreeError({
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
    <div className="mx-auto flex max-w-(--container-read) flex-col gap-4 px-4 py-16 md:px-10 md:py-24">
      <span className="font-display text-title-m font-bold text-ruled-blue">SchoolOye</span>
      <div className="flex flex-col gap-3 border-l-2 border-ink py-1 pl-3.5">
        <span className="font-display text-card font-semibold">Something went wrong</span>
        <p className="text-body text-muted-ink">
          This page couldn't load. It's usually temporary — try again in a moment.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="flex h-11 items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
          >
            Try again
          </button>
          <a href="/" className="flex h-11 items-center font-semibold text-ruled-blue">
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
