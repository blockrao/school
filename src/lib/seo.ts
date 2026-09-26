// Shared metadata helpers so every page's canonical/hreflang is built the
// same way, instead of each page hand-rolling its own (which is how every
// page ended up with a canonical missing its locale prefix -- see git log
// for "canonical" around 2026-09-26). Every page lives under
// src/app/[locale]/..., so a page's own canonical URL always includes its
// locale segment: the canonical for a page IS that page's URL, never a
// different (and here, redirecting) one.
//
// LOCALES mirrors src/app/[locale]/layout.tsx -- keep in sync.
const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

/** Builds this page's own canonical path, e.g. localeCanonical("en", "/exams/jnvst")
 * -> "/en/exams/jnvst". `path` is empty or starts with "/"; never include the
 * locale in `path` itself. Resolved against metadataBase (src/app/layout.tsx)
 * by Next's `alternates.canonical`, so this stays a relative path, not a full URL. */
export function localeCanonical(locale: string, path = ""): string {
  return `/${locale}${path}`;
}

/** Builds the hreflang alternates map for a path shared across all locales,
 * e.g. localeAlternates("/exams/jnvst") -> { "en-IN": "/en/exams/jnvst", "hi-IN": "/hi/exams/jnvst" }. */
export function localeAlternates(path = ""): Record<string, string> {
  return Object.fromEntries(LOCALES.map((locale) => [`${locale}-IN`, localeCanonical(locale, path)]));
}
