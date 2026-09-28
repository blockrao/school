"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
 * CityPicker/MobileBottomNav. Every other item is city-independent.
 */
export function primaryNavItems(
  locale: string,
  areas: CityOption[],
  selectedCity: CityOption | undefined,
): PrimaryNavItem[] {
  const admissionsHref = selectedCity?.href ?? areas[0]?.href ?? `${localePrefix(locale)}/schools`;
  return [
    {
      label: "Schools",
      href: `${localePrefix(locale)}/schools`,
      note: "Search and compare every school",
    },
    {
      label: "Admissions",
      href: admissionsHref,
      note: "Open forms, deadlines, alerts",
    },
    {
      label: "Exams",
      href: `${localePrefix(locale)}/exams`,
      note: "Entrance exams: eligibility, dates, fees",
    },
    { label: "Teachers", href: `${localePrefix(locale)}/teachers`, note: "Profiles" },
    {
      label: "Guides",
      href: `${localePrefix(locale)}/guides`,
      note: "Admission process, documents, boards",
    },
    { label: "For schools", href: "/for-schools", note: "Claim your page, post notices" },
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
  className,
}: {
  locale: string;
  areas: CityOption[];
  className?: string;
}) {
  const pathname = usePathname();
  const selectedCity = useSelectedCity(areas);
  const items = primaryNavItems(locale, areas, selectedCity);

  return (
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
                ? "border-ruled-blue font-semibold text-ruled-blue"
                : "border-transparent font-medium text-ink hover:text-ruled-blue",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
