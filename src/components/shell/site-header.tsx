import Form from "next/form";
import Link from "next/link";
import { CityPicker } from "@/components/shell/city-picker";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { MobileMenu } from "@/components/shell/mobile-menu";
import type { PrimaryNavItem } from "@/components/shell/primary-nav";
import { PrimaryNav } from "@/components/shell/primary-nav";
import { Button } from "@/components/ui/button";
import type { CityOption } from "@/lib/city-preference";

/**
 * `admissionsHref` is the current *default* city's admissions page — computed
 * server-side from `areas[0]` (see layout.tsx). It doesn't react to a cookie
 * switch to a different launched city; that's fine while there's exactly one
 * launched city (nothing to switch to yet). Once a second city launches, make
 * this reactive too, the same way CityPicker already is.
 */
export function primaryNavItems(locale: string, admissionsHref: string): PrimaryNavItem[] {
  return [
    { label: "Schools", href: `/${locale}/schools`, note: "Search and compare every school" },
    {
      label: "Admissions",
      href: admissionsHref,
      note: "Open forms, deadlines, alerts",
    },
    { label: "Teachers", href: `/${locale}/teachers`, note: "Profiles" },
    { label: "Guides", href: `/${locale}/guides`, note: "Admission process, documents, boards" },
    { label: "For schools", href: "/for-schools", note: "Claim your page, post notices" },
  ];
}

export function SiteHeader({ locale, areas }: { locale: string; areas: CityOption[] }) {
  const admissionsHref = areas[0]?.href ?? `/${locale}/schools`;
  const items = primaryNavItems(locale, admissionsHref);

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-copy-white">
      {/* Mobile: hamburger, logo, city, locale switch */}
      <div className="flex h-14 items-center justify-between gap-1 px-1 md:hidden">
        <div className="flex items-center">
          <MobileMenu locale={locale} items={items} />
          <Link href={`/${locale}`} className="font-display text-card font-bold text-ruled-blue">
            SchoolOye
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <CityPicker areas={areas} />
          <LocaleSwitcher />
        </div>
      </div>

      {/* Desktop: logo, primary nav, search, city, locale switch, sign in */}
      <div className="hidden h-17 items-center gap-7 px-10 md:flex">
        <Link href={`/${locale}`} className="font-display text-section font-bold text-ruled-blue">
          SchoolOye
        </Link>
        <PrimaryNav items={items} />
        <Form
          action={`/${locale}/schools`}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-line-blue-strong bg-copy-white px-3"
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="shrink-0 text-slate"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l5 5" />
          </svg>
          <label className="min-w-0 flex-1">
            <span className="sr-only">School, area or teacher</span>
            <input
              type="search"
              name="q"
              placeholder="School, area or teacher"
              className="w-full min-w-0 bg-transparent text-body outline-none placeholder:text-slate"
            />
          </label>
        </Form>
        <div className="flex items-center gap-2">
          <CityPicker areas={areas} />
          <LocaleSwitcher />
          <Button asChild variant="secondary" className="h-11 border-ruled-blue">
            <Link href={`/${locale}/sign-in`}>Sign in</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
