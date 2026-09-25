import { istCalendarDayDiff, istDateLabel } from "@/lib/ist-date";

const STALE_AFTER_DAYS = 7;

export type FreshnessInput = {
  retrievedAt: Date;
  verifiedAt?: Date | null;
};

/**
 * Pure decision: which date actually drives the sentence, and is it stale. Never lets
 * a retrieved-but-unverified fact borrow the "Checked" wording — that's the whole
 * point of keeping `mode` a discriminated union instead of a single daysAgo number.
 */
export type FreshnessState =
  | { mode: "checked"; stale: boolean; daysAgo: number }
  | { mode: "retrieved"; stale: boolean; dateLabel: string };

export function freshnessState(input: FreshnessInput, now: Date): FreshnessState {
  if (input.verifiedAt) {
    const daysAgo = istCalendarDayDiff(now, input.verifiedAt);
    return { mode: "checked", stale: daysAgo > STALE_AFTER_DAYS, daysAgo };
  }

  const daysAgo = istCalendarDayDiff(now, input.retrievedAt);
  return {
    mode: "retrieved",
    stale: daysAgo > STALE_AFTER_DAYS,
    dateLabel: istDateLabel(input.retrievedAt),
  };
}
