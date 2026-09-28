"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/i18n/dictionary";
import { t } from "@/i18n/t";
import type { CityOption } from "@/lib/city-preference";
import { useSelectedCity } from "@/lib/city-preference";
import { homePath, localePrefix } from "@/lib/urls";
import { cn } from "@/lib/utils";

type Tab = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Fixed 5-tab bottom bar, mobile only. The design's "closing soon" red dot on Admissions
 * needs a saved school's real deadline — that data doesn't exist yet (no auth/shortlist
 * flow built), so the dot is intentionally omitted rather than faked. Revisit at Flow 2.10.
 */
export function MobileBottomNav({
  locale,
  areas,
  dict,
}: {
  locale: string;
  areas: CityOption[];
  dict: Dictionary;
}) {
  const pathname = usePathname();
  const city = useSelectedCity(areas);
  const admissionsHref = city?.href ?? `${localePrefix(locale)}/schools`;

  const tabs: Tab[] = [
    {
      label: t(dict, "bottom_nav.home"),
      href: homePath(locale),
      icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    },
    {
      label: t(dict, "bottom_nav.search"),
      href: `${localePrefix(locale)}/schools`,
      icon: (
        <>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l5 5" />
        </>
      ),
    },
    {
      label: t(dict, "bottom_nav.admissions"),
      href: admissionsHref,
      icon: (
        <>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </>
      ),
    },
    {
      label: t(dict, "bottom_nav.saved"),
      href: `${localePrefix(locale)}/my/shortlist`,
      icon: <path d="M6 3.5h12V21l-6-4-6 4z" />,
    },
    {
      label: t(dict, "bottom_nav.account"),
      href: `${localePrefix(locale)}/my`,
      icon: (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </>
      ),
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-rule bg-copy-white pb-1 md:hidden"
      aria-label={t(dict, "bottom_nav.primary_label")}
    >
      {tabs.map((tab, index) => {
        const active = isActive(pathname, tab.href, index === 0);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 border-t-3 text-meta",
              active
                ? "border-ruled-blue font-semibold text-ruled-blue"
                : "border-transparent font-medium text-muted-ink",
            )}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {tab.icon}
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
