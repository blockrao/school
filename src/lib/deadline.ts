import { istCalendarDayDiff, istDayMonthLabel } from "@/lib/ist-date";

const CLOSING_SOON_THRESHOLD_DAYS = 7;

export type DeadlineState =
  | { status: "closing-soon"; daysUntilClose: number; top: string; big: string; bottom: string }
  | { status: "deadline-day"; top: string; big: string; bottom: string }
  | { status: "open"; daysUntilClose: number; top: string; big: string; bottom: string }
  | { status: "open-no-deadline"; top: string; big: string; bottom: string }
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
  return {
    status: "open-no-deadline",
    top: "Open",
    big: "—",
    bottom: "last date not announced",
  };
}

export type DeadlinePillStatus = "not-announced" | "upcoming" | "open" | "closing-soon" | "closed";

/** Maps deadlineState's richer status set down to StatusPill's, with a ready-to-render label. */
export function deadlineToPill(state: DeadlineState): {
  status: DeadlinePillStatus;
  label: string;
} {
  switch (state.status) {
    case "closing-soon":
    case "deadline-day":
      return { status: "closing-soon", label: "Closing soon" };
    case "open":
    case "open-no-deadline":
    case "seats-now":
      return { status: "open", label: "Open" };
    case "upcoming":
      return { status: "upcoming", label: "Upcoming" };
    case "closed":
      return { status: "closed", label: "Closed" };
    case "not-announced":
      return { status: "not-announced", label: "Dates not announced" };
  }
}
