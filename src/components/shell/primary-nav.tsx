"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/i18n/dictionary";
import { t } from "@/i18n/t";
import type { CityOption } from "@/lib/city-preference";
import { useSelectedCity } from "@/lib/city-preference";
import { localePrefix } from "@/lib/urls";
import { cn } from "@/lib/utils";

export type PrimaryNavItem = { label: string; href: string; note?: string };

/**
 * Schools / Admissions / Exams / Teachers / Guides / For schools. Admissions
 * points at the CURRENT city's admissions page. `areas` drives that: server
 * render and first client paint use areas[0] (the platform default) so
 * there's no hydration mismatch, then this corrects to the visitor's actual
 * chosen city (cookie) once useSelectedCity resolves it — same pattern as
 * CityPicker/MobileBottomNav. Every other item is city-independent. `dict` is
 * a prop (not imported here) because this is a Client Component — see
 * src/i18n/t.ts's header comment.
 */
export function primaryNavItems(
  dict: Dictionary,
  locale: string,
  areas: CityOption[],
  selectedCity: CityOption | undefined,
): PrimaryNavItem[] {
  const admissionsHref = selectedCity?.href ?? areas[0]?.href ?? `${localePrefix(locale)}/schools`;
  return [
    {
      label: t(dict, "nav.schools"),
      href: `${localePrefix(locale)}/schools`,
      note: t(dict, "nav.schools_note"),
    },
    {
      label: t(dict, "nav.admissions"),
      href: admissionsHref,
      note: t(dict, "nav.admissions_note"),
    },
    {
      label: t(dict, "nav.exams"),
      href: `${localePrefix(locale)}/exams`,
      note: t(dict, "nav.exams_note"),
    },
    {
      label: t(dict, "nav.teachers"),
      href: `${localePrefix(locale)}/teachers`,
      note: t(dict, "nav.teachers_note"),
    },
    {
      label: t(dict, "nav.guides"),
      href: `${localePrefix(locale)}/guides`,
      note: t(dict, "nav.guides_note"),
    },
    {
      label: t(dict, "nav.for_schools"),
      href: "/for-schools",
      note: t(dict, "nav.for_schools_note"),
    },
  ];
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary nav — Schools / Admissions / Teachers / Guides / For schools. Real
 * links; only the active-state highlight needs the current route. Builds its
 * own items from `locale`/`areas` (rather than taking a precomputed `items`
 * array) so the Admissions link tracks the visitor's actual selected city,
 * not whatever city the server happened to default to.
 */
export function PrimaryNav({
  locale,
  areas,
  dict,
  className,
}: {
  locale: string;
  areas: CityOption[];
  dict: Dictionary;
  className?: string;
}) {
  const pathname = usePathname();
  const selectedCity = useSelectedCity(areas);
  const items = primaryNavItems(dict, locale, areas, selectedCity);

  return (
    // V2 visual foundation (Increment 9): consumed only from SiteHeader, one
    // of the migrated chrome components — v2 tokens throughout.
    <nav className={cn("flex h-full items-stretch gap-0.5", className)}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-[3px] flex items-center border-b-3 px-3 text-body",
              active
                ? "border-v2-accent font-semibold text-v2-accent"
                : "border-transparent font-medium text-v2-ink hover:text-v2-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
