import { istCalendarDayDiff } from "@/lib/ist-date";

/**
 * Closes a real gap flagged 30 Sep 2026: the school portal's "Post an
 * admission notice" form (`submitAdmissionNotice`,
 * src/app/portal/notices/new/actions.ts) writes to `admission_notices`, whose
 * `review` workflow — pending -> approved/rejected — stopped at `approved`
 * and never wrote anything to `admission_cycles`, the table the public page
 * actually reads. An "approved" notice sat there having changed nothing.
 * This module is the pure logic for turning one notice's `extraction`
 * payload into an editable, ops-confirmed proposal for a real
 * `admission_cycles` row.
 *
 * Scope note (30 Sep 2026, Prav): `admission_notices` also carries rows from
 * a separate site-crawling pipeline (its extraction shape has a `cycles[]`
 * array already normalized close to `admission_cycles`'s own columns). Prav
 * confirmed that data source is not wanted and told this not to be wired to
 * this flow anywhere — so `extractProposedCycles` recognizes ONLY the portal
 * form's shape below (`session` + `form_type`) and returns `[]` for anything
 * else, `cycles[]` included, same as it already does for a contact-info-only
 * or unreadable extraction. Don't add the crawler shape back here without
 * asking again.
 *
 * `classCode` is always `null` here — the portal form's `classes` field is
 * free text the school typed (e.g. "Nursery, LKG, Class 1"), never a
 * `class_levels` code, so the review UI must force staff to pick one
 * explicitly rather than guessing from free text — the same "never
 * fabricate a mapping" rule this codebase already applies to
 * `class_label_ambiguous`/`class_label_note` on the table itself.
 */

export type ProposedCycle = {
  classCode: string | null;
  classLabelHint: string | null;
  academicYear: string;
  opensOn: string | null;
  closesOn: string | null;
  resultsOn: string | null;
  formMode: "online" | "offline" | "both" | "unknown";
  formUrl: string | null;
  registrationFee: number | null;
  dobFrom: string | null;
  dobTo: string | null;
  documentsRequired: string[] | null;
  selectionNotes: string | null;
  classLabelAmbiguous: boolean;
  classLabelNote: string | null;
  /** Always "school_reported" — the only source this module builds proposals
   * from is the portal form, the school self-reporting to SchoolOye directly. */
  sourceType: "school_reported";
};

const KNOWN_FORM_MODES = new Set(["online", "offline", "both", "unknown"]);

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fromPortalForm(extraction: Record<string, unknown>): ProposedCycle {
  return {
    classCode: null,
    classLabelHint: asString(extraction.classes),
    academicYear: asString(extraction.session) ?? "",
    opensOn: asString(extraction.opens_on),
    closesOn: asString(extraction.closes_on),
    resultsOn: null,
    formMode: (() => {
      const m = asString(extraction.form_type);
      return m && KNOWN_FORM_MODES.has(m) ? (m as ProposedCycle["formMode"]) : "unknown";
    })(),
    formUrl: null,
    registrationFee: asNumber(extraction.registration_fee),
    dobFrom: null,
    dobTo: null,
    documentsRequired: null,
    selectionNotes: null,
    // A free-text "classes" field almost never names exactly one class_levels
    // code, so this is always flagged ambiguous until staff picks a code and,
    // implicitly, resolves it below by choosing which single class it's for.
    classLabelAmbiguous: true,
    classLabelNote: asString(extraction.classes),
    sourceType: "school_reported",
  };
}

/**
 * `[]` means nothing to publish — the existing plain Approve/Reject is still
 * right for this notice. Recognizes only the portal form's shape (`session` +
 * `form_type`) — see the scope note above for why the crawler's `cycles[]`
 * shape is deliberately not handled here.
 */
export function extractProposedCycles(extraction: unknown): ProposedCycle[] {
  if (extraction === null || typeof extraction !== "object") return [];
  const e = extraction as Record<string, unknown>;

  if (typeof e.session === "string" && typeof e.form_type === "string") {
    return [fromPortalForm(e)];
  }

  return [];
}

/**
 * Status derived only from dates, in IST calendar days — the same
 * open/closing-soon/closed math `deadlineState` (src/lib/deadline.ts) already
 * uses for the public page, kept independent here since this returns the DB's
 * `admission_status` enum (underscored) rather than `DeadlinePillStatus`
 * (hyphenated), and never guesses `postponed`/`cancelled`/`results_out` —
 * those need a human, so the review form offers them as an explicit override
 * rather than this function inventing one from a date range.
 */
export function deriveAdmissionStatus(
  opensOn: string | null,
  closesOn: string | null,
  now: Date,
): "not_announced" | "upcoming" | "open" | "closing_soon" | "closed" {
  if (!opensOn && !closesOn) return "not_announced";
  if (opensOn && istCalendarDayDiff(new Date(opensOn), now) > 0) return "upcoming";
  if (closesOn) {
    const daysUntilClose = istCalendarDayDiff(new Date(closesOn), now);
    if (daysUntilClose < 0) return "closed";
    if (daysUntilClose <= 7) return "closing_soon";
  }
  return "open";
}
