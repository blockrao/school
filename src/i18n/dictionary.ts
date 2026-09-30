import "server-only";

// Hindi-readiness checklist item 1/7 (2026-09-28, "hi" wired 2026-09-30): one
// dictionary loader, one t() below it. "hi" is a full, hand-translated
// mirror of every key in locales/en.json (site chrome: nav, footer, bottom
// nav, common strings, enums) plus the exam-page namespace — see
// src/app/[locale]/exams/[slug]/page.tsx and @/lib/i18n-completeness for how
// a given exam additionally gates its own per-field Hindi content before it
// is allowed to render at a /hi/ URL (proxy.ts only lets /hi/exams/* pass
// through un-redirected; every other locale root still hard-redirects to
// English until it gets the same per-page treatment).
const dictionaries = {
  en: () => import("./locales/en.json").then((mod) => mod.default),
  hi: () => import("./locales/hi.json").then((mod) => mod.default),
} as const;

export type Locale = keyof typeof dictionaries;

export function hasLocale(locale: string): locale is Locale {
  return locale in dictionaries;
}

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

/**
 * Server-only loader — call once per request (typically in `[locale]/layout.tsx`
 * or a page) and pass the resolved `Dictionary` down as a prop, the same way
 * `locale`/`areas` are already threaded through this app. Falls back to "en"
 * for any locale without a registered dictionary, rather than throwing —
 * matching the app's general "render the fallback, don't 500" posture.
 */
export async function getDictionary(locale: string): Promise<Dictionary> {
  return hasLocale(locale) ? dictionaries[locale]() : dictionaries.en();
}
