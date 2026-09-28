"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthStatusLink } from "@/components/shell/auth-status-link";
import { primaryNavItems } from "@/components/shell/primary-nav";
import type { Dictionary } from "@/i18n/dictionary";
import { t } from "@/i18n/t";
import type { CityOption } from "@/lib/city-preference";
import { useSelectedCity } from "@/lib/city-preference";

/**
 * Hamburger trigger + slide-in overlay panel. Open/close is real client
 * state — the one piece of the shell that needs it. Builds its own nav items
 * from `areas` (like PrimaryNav) rather than taking a precomputed list, so
 * its Admissions link also tracks the visitor's actual selected city.
 */
export function MobileMenu({
  locale,
  areas,
  dict,
}: {
  locale: string;
  areas: CityOption[];
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const selectedCity = useSelectedCity(areas);
  const items = primaryNavItems(dict, locale, areas, selectedCity);

  return (
    <>
      <button
        type="button"
        aria-label={t(dict, "common.menu")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center text-v2-ink"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-v2-ink/55"
          />
          <div
            data-testid="mobile-menu-panel"
            className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-v2-surface font-v2-sans"
          >
            <div className="flex items-center justify-between border-b border-v2-line px-4 py-2">
              <span className="text-card font-bold text-v2-accent">{t(dict, "common.brand")}</span>
              <button
                type="button"
                aria-label={t(dict, "common.close_menu")}
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-body text-v2-ink"
              >
                ×
              </button>
            </div>

            <div className="border-b border-v2-line p-4">
              <AuthStatusLink
                locale={locale}
                variant="v2Primary"
                className="w-full"
                onNavigate={() => setOpen(false)}
              />
            </div>

            <nav className="flex flex-col py-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-15 flex-col justify-center border-l-3 border-transparent px-4 py-1.5 hover:bg-v2-sunk"
                >
                  <span className="text-section font-semibold text-v2-ink">{item.label}</span>
                  {item.note && <span className="text-meta text-v2-ink-3">{item.note}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
