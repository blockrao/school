// Shared metadata helpers so every page's canonical/hreflang is built the same
// way (docs/spec/urls-and-routing.md §6, §10; D-121).
import { lp } from "@/lib/urls";

/**
 * This page's own canonical path: English at the root, other languages under
 * /{lang}/. `path` is the unprefixed path ("" or starting with "/"). Resolved
 * to an absolute URL against metadataBase (src/app/layout.tsx).
 */
export function localeCanonical(locale: string, path = ""): string {
  return lp(locale, path);
}

/**
 * hreflang map for a page. Only pages that actually exist in more than one
 * language get alternates: one entry per available language plus x-default →
 * English. No page is translated yet, so this returns an empty map (no
 * hreflang) unless `translated` lists the extra languages.
 */
export function localeAlternates(
  path = "",
  translated: readonly string[] = [],
): Record<string, string> {
  if (translated.length === 0) return {};
  const map: Record<string, string> = { "en-IN": lp("en", path), "x-default": lp("en", path) };
  for (const locale of translated) map[`${locale}-IN`] = lp(locale, path);
  return map;
}
