import { deadlineState } from "@/lib/deadline";
import { formatDate } from "@/lib/format";
import { formatGradeRange } from "@/lib/grades";

/**
 * Increment 5 — the v2 design's six-slot "At a glance" decision strip
 * (design C4–C5).
 *
 * Architectural principle Prav locked for this increment: the strip is a
 * presentation layer over existing domain facts, not a new data model.
 * `domain data → normalized display value/status → DecisionSlot` — each
 * builder below owns its own source table's shape and trust semantics;
 * `<DecisionStrip>` (the component) only ever sees this normalized shape
 * and has no idea whether a slot came from `admission_cycles`, `schools`,
 * or nowhere at all. That keeps the component reusable (comparison mode,
 * a future locality card) without re-deriving verification rules per slot
 * per caller.
 *
 * Two of the six slots (student–teacher ratio, board result) have no
 * backing table anywhere in this schema today — `unsupportedSlot` renders
 * them as an honest "Not yet verified" rather than a fabricated figure.
 * Annual fee is the same today for a different reason: `fee_items` exists
 * and has live rows in principle, but (a) has zero rows in production as
 * of this increment and (b) has no curated `api.*` view the way every
 * other public read on this page does (see `src/lib/db/public-adapter.ts`'s
 * header comment on the api-schema-only rule, and its existing precedent
 * for `school_identifiers`/`field_provenance`: no view yet → return empty,
 * documented TODO, not a raw-table read). Building a fee query this
 * increment would mean either adding a new `api.*` view (schema-adjacent —
 * explicitly out of scope) or breaking that established convention, so the
 * fee slot is `unsupportedSlot` too, for now — TODO once
 * `api.public_school_fees` (or similar) exists and has real rows to read.
 */

export type DecisionSlot =
  | {
      id: string;
      label: string;
      status: "available";
      value: string;
      context?: string;
      sourceLabel?: string;
    }
  | { id: string; label: string; status: "unverified" };

export function unsupportedSlot(id: string, label: string): DecisionSlot {
  return { id, label, status: "unverified" };
}

/**
 * Mirrors the shape entity-page.tsx already extracts from `PublicSchoolAdmission`.
 *
 * `now` is required so a `closes_on` in the past is never shown as if it were
 * still live. This reuses `deadlineState` — the same pure, IST-calendar-day
 * function `DeadlineMargin` already uses in the full Admissions section —
 * rather than re-deriving "is this deadline in the past" independently; a
 * real production row (a closed 2027-28 nursery cycle whose form deadline had
 * already passed) showed this slot rendering "Closes <past date>" with the
 * same confident styling as a live deadline, because the old logic only ever
 * checked `status === "not_announced"` and never looked at whether the date
 * itself had passed.
 */
export function buildAdmissionsSlot(
  admission: {
    academic_year: string;
    class_code: string;
    opens_on: string | null;
    closes_on: string | null;
    status: string;
  } | null,
  now: Date,
): DecisionSlot {
  const label = admission ? `Admissions ${admission.academic_year}` : "Admissions";
  if (
    !admission ||
    (!admission.opens_on && !admission.closes_on && admission.status === "not_announced")
  ) {
    return { id: "admissions", label, status: "unverified" };
  }

  if (admission.closes_on) {
    const state = deadlineState({ closesAt: new Date(admission.closes_on) }, now);
    if (state.status === "closed") {
      return { id: "admissions", label, status: "available", value: "Closed" };
    }
  }

  const value = admission.closes_on
    ? `Closes ${formatDate(admission.closes_on)}`
    : admission.opens_on
      ? `Opens ${formatDate(admission.opens_on)}`
      : "Dates not yet announced";
  const context = admission.opens_on
    ? `Registration from ${formatDate(admission.opens_on)}`
    : undefined;
  return { id: "admissions", label, status: "available", value, context };
}

/**
 * A school can have more than one `admission_cycles` row live at once (e.g.
 * a closed Nursery cycle and a separately-open Class XI cycle — the DAV
 * Public School Gurugram real-data test that surfaced this). `closes_on`
 * ascending puts a closed cycle with a real past date ahead of an open
 * cycle that has no `closes_on` yet (nulls sort last), so picking
 * `admissions[0]` silently shows the wrong cycle as primary.
 *
 * This prefers the first cycle whose status is still actionable
 * (not `closed` or `results_out`) over one that has already concluded,
 * falling back to the existing order when every cycle is closed/concluded
 * so a school with only past cycles still shows its most recent one.
 */
const ACTIONABLE_ADMISSION_STATUSES = new Set([
  "not_announced",
  "upcoming",
  "open",
  "closing_soon",
]);

export function selectPrimaryAdmission<T extends { status: string }>(
  admissions: readonly T[],
): T | undefined {
  return admissions.find((a) => ACTIONABLE_ADMISSION_STATUSES.has(a.status)) ?? admissions[0];
}

export function buildEntryClassesSlot(school: {
  min_class: string | null;
  max_class: string | null;
}): DecisionSlot {
  const grades = formatGradeRange(school.min_class, school.max_class);
  if (grades === "Not yet published") {
    return { id: "entry_classes", label: "Entry classes", status: "unverified" };
  }
  return { id: "entry_classes", label: "Entry classes", status: "available", value: grades };
}

export function buildLocationSlot(
  school: {
    locality_name: string | null;
    address: string | null;
  },
  cityName: string | null,
): DecisionSlot {
  const value = [school.locality_name, cityName].filter(Boolean).join(", ");
  if (!value) {
    return { id: "location", label: "Location", status: "unverified" };
  }
  return {
    id: "location",
    label: "Location",
    status: "available",
    value,
    context: school.address ?? undefined,
  };
}

export function buildDecisionStrip(input: {
  admission: {
    academic_year: string;
    class_code: string;
    opens_on: string | null;
    closes_on: string | null;
    status: string;
  } | null;
  school: {
    min_class: string | null;
    max_class: string | null;
    locality_name: string | null;
    address: string | null;
  };
  cityName: string | null;
  now: Date;
}): DecisionSlot[] {
  return [
    buildAdmissionsSlot(input.admission, input.now),
    unsupportedSlot("annual_fee", "Annual fee"),
    buildEntryClassesSlot(input.school),
    unsupportedSlot("student_teacher_ratio", "Student–teacher ratio"),
    unsupportedSlot("board_result", "Board result"),
    buildLocationSlot(input.school, input.cityName),
  ];
}
