import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Class/board style filter opener. `href` points at the page state this chip leads
 * to (e.g. opening the class picker via a query param or drawer route) — selection
 * is a navigation, not client state, same as ViewToggle/ResultTabs/CountToggleGroup.
 */
export function FilterChip({
  href,
  selected = false,
  children,
  className,
}: {
  href: string;
  selected?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex h-11 items-center rounded-full border px-3.5 font-semibold text-body",
        selected
          ? "border-ruled-blue bg-pill-results-bg text-ruled-blue"
          : "border-line-blue text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * An already-applied filter, e.g. "Within 5 km". `href` points at the same page with
 * this filter's query param stripped — removal is a navigation, not client state.
 */
export function RemovableFilterChip({
  href,
  children,
  className,
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-full border border-line-blue bg-copy-white py-0 pr-0.5 pl-3 text-body",
        className,
      )}
    >
      {children}
      <Link
        href={href}
        aria-label={`Remove filter: ${children}`}
        className="w-7.5 text-center text-muted-ink"
      >
        ×
      </Link>
    </span>
  );
}
