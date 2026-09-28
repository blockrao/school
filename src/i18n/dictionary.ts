import "server-only";

// Hindi-readiness checklist item 1/7 (2026-09-28): one dictionary loader, one
// t() below it. Only "en" is registered — /hi/ routing exists in the router
// already (separate thread owns that URL work) but has no real translations
// yet, so it is deliberately NOT wired in here. Adding a locale later is:
// drop `locales/hi.json` next to this file, add `hi: () => import(...)` to
// the map below, done — nothing else in the app should need to change if
// every user-facing string actually went through t().
const dictionaries = {
  en: () => import("./locales/en.json").then((mod) => mod.default),
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
