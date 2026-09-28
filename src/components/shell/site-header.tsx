import Form from "next/form";
import Link from "next/link";
import { AuthStatusLink } from "@/components/shell/auth-status-link";
import { CityPicker } from "@/components/shell/city-picker";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { MobileMenu } from "@/components/shell/mobile-menu";
import { PrimaryNav } from "@/components/shell/primary-nav";
import type { Dictionary } from "@/i18n/dictionary";
import { t } from "@/i18n/t";
import type { CityOption } from "@/lib/city-preference";
import { homePath, localePrefix } from "@/lib/urls";

export function SiteHeader({
  locale,
  areas,
  dict,
}: {
  locale: string;
  areas: CityOption[];
  dict: Dictionary;
}) {
  return (
    // V2 visual foundation (Increment 9): this is the "global shell boundary" —
    // re-themed with --v2 tokens/IBM Plex, while <main> (page content) keeps
    // reading the un-prefixed v1 tokens until its own migration increment.
    <header className="sticky top-0 z-30 border-b border-so-line bg-so-surface font-so-sans">
      {/* Mobile: hamburger, logo, city, locale switch */}
      <div className="flex h-14 items-center justify-between gap-1 px-1 md:hidden">
        <div className="flex items-center">
          <MobileMenu locale={locale} areas={areas} dict={dict} />
          <Link href={homePath(locale)} className="text-card font-bold text-so-accent">
            {t(dict, "common.brand")}
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <CityPicker areas={areas} />
          <LocaleSwitcher />
        </div>
      </div>

      {/* Desktop: logo, primary nav, search, city, locale switch, sign in */}
      <div className="hidden h-17 items-center gap-7 px-10 md:flex">
        <Link href={homePath(locale)} className="text-section font-bold text-so-accent">
          {t(dict, "common.brand")}
        </Link>
        <PrimaryNav locale={locale} areas={areas} dict={dict} />
        <Form
          action={`${localePrefix(locale)}/schools`}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-so-line2 bg-so-surface px-3"
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
            className="shrink-0 text-so-ink3"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l5 5" />
          </svg>
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t(dict, "common.search_placeholder")}</span>
            <input
              type="search"
              name="q"
              placeholder={t(dict, "common.search_placeholder")}
              className="w-full min-w-0 bg-transparent text-body text-so-ink outline-none placeholder:text-so-ink3"
            />
          </label>
        </Form>
        <div className="flex items-center gap-2">
          <CityPicker areas={areas} />
          <LocaleSwitcher />
          <AuthStatusLink locale={locale} variant="soSecondary" className="h-11 border-so-accent" />
        </div>
      </div>
    </header>
  );
}
