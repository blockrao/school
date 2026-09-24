const IST_TIME_ZONE = "Asia/Kolkata";
const MS_PER_DAY = 86_400_000;
const CLOSING_SOON_THRESHOLD_DAYS = 7;

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

/** Day index (days since epoch) of `date`'s IST calendar date, ignoring time-of-day. */
function istCalendarDayIndex(date: Date): number {
  const [year, month, day] = istDatePartsFormatter.format(date).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Whole calendar days from `now`'s IST date to `target`'s IST date. Can be negative. */
function istCalendarDayDiff(target: Date, now: Date): number {
  return istCalendarDayIndex(target) - istCalendarDayIndex(now);
}

/** "31 Oct" style label for a date's IST calendar day. */
function istDayMonthLabel(date: Date): { day: string; month: string } {
  const parts = istDayMonthFormatter.formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return { day, month };
}

export type DeadlineState =
  | { status: "closing-soon"; daysUntilClose: number; top: string; big: string; bottom: string }
  | { status: "deadline-day"; top: string; big: string; bottom: string }
  | { status: "open"; daysUntilClose: number | null; top: string; big: string; bottom: string }
  | { status: "upcoming"; daysUntilOpen: number; top: string; big: string; bottom: string }
  | { status: "not-announced"; top: string; big: string; bottom: string }
  | { status: "closed"; top: string; big: string; bottom: string }
  | { status: "seats-now"; count: number; grade: string; top: string; big: string; bottom: string };

export type DeadlineInput = {
  opensAt?: Date | null;
  closesAt?: Date | null;
  seatsNow?: { count: number; grade: string } | null;
};

/**
 * Pure function: derives the deadline-margin state from actual dates, compared in
 * IST calendar days (not UTC, not server-local time, not a raw 24h ms window).
 * This is the only place margin-red is reachable from — callers never pass a variant.
 */
export function deadlineState(input: DeadlineInput, now: Date): DeadlineState {
  if (input.seatsNow) {
    return {
      status: "seats-now",
      count: input.seatsNow.count,
      grade: input.seatsNow.grade,
      top: "Seats",
      big: String(input.seatsNow.count),
      bottom: `in ${input.seatsNow.grade}`,
    };
  }

  if (!input.opensAt && !input.closesAt) {
    return { status: "not-announced", top: "Dates", big: "—", bottom: "not out" };
  }

  if (input.opensAt) {
    const daysUntilOpen = istCalendarDayDiff(input.opensAt, now);
    if (daysUntilOpen > 0) {
      const { day, month } = istDayMonthLabel(input.opensAt);
      return { status: "upcoming", daysUntilOpen, top: "Opens", big: day, bottom: month };
    }
  }

  if (input.closesAt) {
    const daysUntilClose = istCalendarDayDiff(input.closesAt, now);

    if (daysUntilClose < 0) {
      const { day, month } = istDayMonthLabel(input.closesAt);
      return { status: "closed", top: "Closed", big: day, bottom: month };
    }
    if (daysUntilClose === 0) {
      return { status: "deadline-day", top: "Closes", big: "0", bottom: "days · today" };
    }
    if (daysUntilClose <= CLOSING_SOON_THRESHOLD_DAYS) {
      return {
        status: "closing-soon",
        daysUntilClose,
        top: "Closes in",
        big: String(daysUntilClose),
        bottom: daysUntilClose === 1 ? "day" : "days",
      };
    }
    return {
      status: "open",
      daysUntilClose,
      top: "Closes in",
      big: String(daysUntilClose),
      bottom: "days",
    };
  }

  // opensAt is today or in the past, and there's no closesAt to count down to.
  return { status: "open", daysUntilClose: null, top: "Admissions", big: "Open", bottom: "" };
}
