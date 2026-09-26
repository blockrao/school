/**
 * Pure age-eligibility logic, generic across any admission cycle that has a
 * date-of-birth window (`dob_from`/`dob_to` on `admission_cycles` — already
 * used by exams today; school cycles carry the same columns and can adopt
 * this unchanged once their view/contract exposes them). No exam- or
 * school-specific knowledge belongs here — only date math.
 *
 * Mirrors the style of deadline.ts: pure functions, no I/O, dates compared
 * as calendar dates (a `dob_from`/`dob_to` is a Postgres `date`, which
 * PostgREST returns as a plain "YYYY-MM-DD" string with no time-of-day to
 * get wrong).
 */

export type CycleApplyStatus = "open" | "closing-soon" | "upcoming" | "closed" | "not-announced";

export type EligibilityCycle = {
  id: string;
  /** Human label, e.g. "Class 6 · 2027-28". */
  label: string;
  /** Inclusive earliest allowed birth date ("YYYY-MM-DD"), or null if unknown. */
  dobFrom: string | null;
  /** Inclusive latest allowed birth date ("YYYY-MM-DD"), or null if unknown. */
  dobTo: string | null;
  applyStatus: CycleApplyStatus;
  formUrl?: string | null;
};

export type EligibilityVerdict =
  | { kind: "eligible" }
  | { kind: "too_young"; monthsShort: number }
  | { kind: "too_old"; monthsOver: number }
  | { kind: "unknown" };

export type EligibilityResult = {
  cycle: EligibilityCycle;
  verdict: EligibilityVerdict;
};

/** Parses a "YYYY-MM-DD" date-only string without a timezone shift. */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole months from `a` to `b` (b − a), clamped to zero. Assumes b >= a. */
function monthsBetween(a: Date, b: Date): number {
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(months, 0);
}

export function classifyEligibility(dob: Date, cycle: EligibilityCycle): EligibilityVerdict {
  const from = cycle.dobFrom ? parseDateOnly(cycle.dobFrom) : null;
  const to = cycle.dobTo ? parseDateOnly(cycle.dobTo) : null;
  if (!from || !to) return { kind: "unknown" };

  if (dob >= from && dob <= to) return { kind: "eligible" };
  // Born after the youngest allowed birth date → not old enough yet.
  if (dob > to) return { kind: "too_young", monthsShort: monthsBetween(to, dob) };
  // Born before the oldest allowed birth date → past the upper age limit.
  return { kind: "too_old", monthsOver: monthsBetween(dob, from) };
}

export function checkEligibility(dob: Date, cycles: EligibilityCycle[]): EligibilityResult[] {
  return cycles.map((cycle) => ({ cycle, verdict: classifyEligibility(dob, cycle) }));
}

/** "1 yr 3 mo" / "8 mo" / "less than a month" — for surfacing how close a miss was. */
export function humanizeMonths(months: number): string {
  if (months <= 0) return "less than a month";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (rem > 0) parts.push(`${rem} mo${rem > 1 ? "s" : ""}`);
  return parts.join(" ") || "less than a month";
}

export function canApplyNow(status: CycleApplyStatus): boolean {
  return status === "open" || status === "closing-soon";
}
