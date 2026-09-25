"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LOCALES = ["en", "hi"] as const;
const LABELS: Record<(typeof LOCALES)[number], string> = { en: "EN", hi: "हिं" };

/** EN/हिं toggle. A route switch (swaps the locale segment of the current path), not client state. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const currentLocale = segments[1];
  const rest = segments.slice(2).join("/");

  return (
    <div className={cn("flex overflow-hidden rounded-md border border-line-blue", className)}>
      {LOCALES.map((locale) => {
        const active = locale === currentLocale;
        return (
          <Link
            key={locale}
            href={`/${locale}${rest ? `/${rest}` : ""}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex h-11 min-w-11.5 items-center justify-center text-meta font-semibold",
              locale === "hi" && "font-display font-medium text-body",
              active ? "bg-ruled-blue text-copy-white" : "text-ink",
            )}
          >
            {LABELS[locale]}
          </Link>
        );
      })}
    </div>
  );
}
