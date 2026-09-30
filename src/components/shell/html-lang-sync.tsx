"use client";

import { useEffect } from "react";

/**
 * Keeps the real <html lang> in sync with the active locale, client-side.
 *
 * Why not just set it in the root layout from params/headers: the root
 * layout (src/app/layout.tsx) sits ABOVE [locale] and is shared by every
 * top-level route (for-schools, portal, ops, auth, dev), so it can't read
 * `params.locale` directly. Reading the locale via `headers()`/`cookies()`
 * there would work, but calling a dynamic API in a layout opts every page
 * under it out of static rendering/ISR — see the "isSignedIn" comment in
 * [locale]/layout.tsx for the exact same tradeoff hit before. The correct
 * static-safe fix (Next's "multiple root layouts" pattern: move <html> down
 * into a layout that owns `params.locale`) means restructuring every
 * top-level route into its own route group — real, but too much blast
 * radius to do blind in one pass without a working local build to verify
 * against (2026-09-30: found this gap the same night /hi/exams/rms-cet
 * first went live — was always latent, just never visible before, since no
 * page had ever actually rendered non-English content).
 *
 * This component is the interim fix: it doesn't touch the root layout or
 * any dynamic API, so static generation/ISR is completely unaffected, and
 * it corrects the DOM's lang attribute for real visitors and any renderer
 * that executes JS (screen readers on an open page, Googlebot's rendering
 * pass). What it does NOT fix: the raw server-rendered HTML a non-JS crawler
 * would see still says lang="en" until the layout split above is done.
 */
export function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale === "hi" ? "hi" : "en";
  }, [locale]);
  return null;
}
