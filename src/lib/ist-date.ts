const IST_TIME_ZONE = "Asia/Kolkata";
const MS_PER_DAY = 86_400_000;

const istDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const istDayMonthFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST_TIME_ZONE,
  day: "numeric",
  month: "short",
});

const istDayMonthYearFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Day index (days since epoch) of `date`'s IST calendar date, ignoring time-of-day. */
export function istCalendarDayIndex(date: Date): number {
  const [year, month, day] = istDatePartsFormatter.format(date).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Whole calendar days from `now`'s IST date to `target`'s IST date. Can be negative. */
export function istCalendarDayDiff(target: Date, now: Date): number {
  return istCalendarDayIndex(target) - istCalendarDayIndex(now);
}

/** "31 Oct" style label for a date's IST calendar day. */
export function istDayMonthLabel(date: Date): { day: string; month: string } {
  const parts = istDayMonthFormatter.formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return { day, month };
}

/** "31 Oct 2026" style absolute date label, for facts where implying "N days ago" would overstate confidence. */
export function istDateLabel(date: Date): string {
  return istDayMonthYearFormatter.format(date);
}
