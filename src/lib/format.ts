// Hindi-readiness checklist item 3 (2026-09-28): one place for currency/date/
// number formatting, all backed by Intl with the locale passed in as a
// parameter (hard-coded "en-IN" at every call site for now — nothing here
// adds Hindi, it just means a later locale switch is a one-line change per
// call site instead of a grep-and-replace across the app).
//
// For IST-calendar-day arithmetic (admission-deadline "in N days" math),
// use src/lib/ist-date.ts instead — that's a distinct timezone-correctness
// concern, not a formatting one, and already exists.

const DEFAULT_LOCALE = "en-IN";

/**
 * "₹1,20,000" (Indian digit grouping) — never `` `₹${amount}` `` or
 * `.toLocaleString()` at the call site; both make an eventual second locale
 * a grep-everywhere job instead of a parameter change here.
 */
export function formatCurrency(
  amountInr: number,
  opts: { maximumFractionDigits?: number; locale?: string } = {},
): string {
  const { maximumFractionDigits = 0, locale = DEFAULT_LOCALE } = opts;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
  }).format(amountInr);
}

/** Plain grouped number, e.g. "1,20,000" — for counts/quantities, not money. */
export function formatNumber(value: number, opts: { locale?: string } = {}): string {
  const { locale = DEFAULT_LOCALE } = opts;
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * "31 Oct 2026" / "31 Oct 2026, 4:30 pm" — general-purpose date/time display.
 * Not timezone-pinned (unlike ist-date.ts's formatters); pass `timeZone` in
 * opts for anything that must read the same regardless of server/viewer TZ.
 */
export function formatDate(
  date: Date | string,
  opts: Intl.DateTimeFormatOptions & { locale?: string } = {},
): string {
  const { locale = DEFAULT_LOCALE, ...dateTimeOpts } = opts;
  const value = typeof date === "string" ? new Date(date) : date;
  const hasOpts = Object.keys(dateTimeOpts).length > 0;
  return new Intl.DateTimeFormat(
    locale,
    hasOpts ? dateTimeOpts : { day: "numeric", month: "short", year: "numeric" },
  ).format(value);
}

/** "31 Oct 2026, 4:30 pm" — date plus time, for activity logs and timestamps. */
export function formatDateTime(date: Date | string, opts: { locale?: string } = {}): string {
  return formatDate(date, {
    ...opts,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
