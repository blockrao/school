"use client";

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
  /** Precomputed `/[locale]/[state]/[city]` href — locale is baked in by the server caller. */
  href: string;
};

function readCityCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CITY_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function saveCityCookie(slug: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${CITY_COOKIE_NAME}=${encodeURIComponent(slug)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/**
 * Which launched city to show: the cookie the user previously chose, if it's
 * still one of the currently-launched `areas` — otherwise the platform default
 * (areas[0], the server's own pick, currently Jaipur). Server and the first
 * client render both use the default; the cookie correction (if any) applies
 * in an effect after mount.
 */
export function useSelectedCity(areas: CityOption[]): CityOption | undefined {
  const fallback = areas[0];
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(fallback?.slug);

  useEffect(() => {
    const cookieSlug = readCityCookie();
    if (cookieSlug && areas.some((a) => a.slug === cookieSlug)) {
      setSelectedSlug(cookieSlug);
    }
  }, [areas]);

  return areas.find((a) => a.slug === selectedSlug) ?? fallback;
}
