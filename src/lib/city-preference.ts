"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CITY_COOKIE_NAME } from "@/lib/city-cookie";

/**
 * Persists the user's chosen city across visits. Client-only (cookie read/write
 * happens in the browser) so the shared shell (SiteHeader, MobileBottomNav) can
 * stay server-rendered for the static default and correct itself post-hydration
 * once the cookie is known — no SSR/client markup mismatch, since the very first
 * client render still matches the server's default-area render.
 *
 * The cookie name lives in src/lib/city-cookie.ts, shared with the server-side
 * reader (getSelectedCityArea in public-adapter.ts) so both sides always agree.
 */
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type CityOption = {
  slug: string;
  name: string;
  stateSlug: string;
  /** Precomputed `/[locale]/[city]` href — locale is baked in by the server caller. */
  href: string;
};

function readCityCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CITY_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function saveCityCookie(slug: string) {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API isn't supported in Safari/Firefox yet; this needs to work in every browser.
  document.cookie = `${CITY_COOKIE_NAME}=${encodeURIComponent(slug)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/**
 * Which launched city to show: the cookie the user previously chose, if it's
 * still one of the currently-launched `areas` — otherwise the platform default
 * (areas[0], the server's own pick, currently Jaipur). Server and the first
 * client render both use the default; the cookie correction (if any) applies
 * in an effect after mount.
 *
 * `pathname` is in the effect's dependency array (fixed 2026-09-28) so every
 * component calling this hook (CityPicker, PrimaryNav, MobileMenu,
 * MobileBottomNav — each its own independent hook instance, there's no shared
 * selection state) re-reads the cookie on every navigation, not just once on
 * mount. Without it: CityPicker.selectCity() saves the cookie and
 * router.push()es to the new city, but [locale]/layout.tsx (and this
 * component within it) isn't remounted by a client-side navigation between
 * sibling routes, so `areas` never changes identity and the old effect never
 * re-ran — the header kept showing the previously-selected city after a
 * click, which read as "the city picker doesn't work" even though the
 * navigation itself succeeded.
 */
export function useSelectedCity(areas: CityOption[]): CityOption | undefined {
  const fallback = areas[0];
  const pathname = usePathname();
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(fallback?.slug);

  useEffect(() => {
    // Referencing pathname (even though its value isn't otherwise needed) is what makes
    // it a legitimate dependency below — it's what retriggers this effect on every
    // client-side navigation, since areas' identity doesn't change on a sibling-route
    // navigation within the same layout (see the doc comment above).
    void pathname;
    const cookieSlug = readCityCookie();
    if (cookieSlug && areas.some((a) => a.slug === cookieSlug)) {
      setSelectedSlug(cookieSlug);
    }
  }, [areas, pathname]);

  return areas.find((a) => a.slug === selectedSlug) ?? fallback;
}
