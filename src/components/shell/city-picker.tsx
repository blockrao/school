"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type CityOption, saveCityCookie, useSelectedCity } from "@/lib/city-preference";
import { cn } from "@/lib/utils";

/**
 * Shows the user's chosen city and lets them switch it. Selecting a city saves
 * it (cookie, one year) so it's remembered on the next visit, and navigates to
 * that city. Every area (`api.public_areas`) is offered — no launch gate any
 * more (removed 30 Sep 2026) — this list grows automatically as new areas are
 * added, no code change needed here.
 */
export function CityPicker({ areas, className }: { areas: CityOption[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const current = useSelectedCity(areas);

  if (areas.length === 0) return null;

  // Nothing to switch between yet — still show the city as a plain label, not a button,
  // so the UI doesn't imply choice that doesn't exist.
  if (areas.length === 1) {
    return (
      <span className={cn("px-2 text-body font-medium text-so-ink", className)}>
        {current?.name}
      </span>
    );
  }

  function selectCity(area: CityOption) {
    saveCityCookie(area.slug);
    setOpen(false);
    router.push(area.href);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 text-body font-medium text-so-ink focus-visible:outline-so-accent"
      >
        {current?.name ?? "Choose city"}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="listbox"
            aria-label="Choose your city"
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-so-line bg-so-surface font-so-sans shadow-lg"
          >
            {areas.map((area) => {
              const active = area.slug === current?.slug;
              return (
                <div key={area.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => selectCity(area)}
                    className={cn(
                      "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-body focus-visible:outline-so-accent",
                      active
                        ? "bg-so-sunk font-semibold text-so-accent"
                        : "text-so-ink hover:bg-so-sunk",
                    )}
                  >
                    {area.name}
                    <span className="text-meta text-so-ink3">
                      {area.stateSlug !== area.slug ? area.stateSlug : ""}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
