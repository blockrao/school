"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthStatusLink } from "@/components/shell/auth-status-link";
import { primaryNavItems } from "@/components/shell/primary-nav";
import type { CityOption } from "@/lib/city-preference";
import { useSelectedCity } from "@/lib/city-preference";

/**
 * Hamburger trigger + slide-in overlay panel. Open/close is real client
 * state — the one piece of the shell that needs it. Builds its own nav items
 * from `areas` (like PrimaryNav) rather than taking a precomputed list, so
 * its Admissions link also tracks the visitor's actual selected city.
 */
export function MobileMenu({ locale, areas }: { locale: string; areas: CityOption[] }) {
  const [open, setOpen] = useState(false);
  const selectedCity = useSelectedCity(areas);
  const items = primaryNavItems(locale, areas, selectedCity);

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center text-ink"
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
            className="absolute inset-0 bg-ink/55"
          />
          <div
            data-testid="mobile-menu-panel"
            className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-copy-white"
          >
            <div className="flex items-center justify-between border-b border-rule px-4 py-2">
              <span className="font-display text-card font-bold text-ruled-blue">SchoolOye</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-body text-ink"
              >
                ×
              </button>
            </div>

            <div className="border-b border-rule p-4">
              <AuthStatusLink
                locale={locale}
                variant="primary"
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
                  className="flex min-h-15 flex-col justify-center border-l-3 border-transparent px-4 py-1.5 hover:bg-margin-paper"
                >
                  <span className="font-display text-section font-semibold text-ink">
                    {item.label}
                  </span>
                  {item.note && <span className="text-meta text-muted-ink">{item.note}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
