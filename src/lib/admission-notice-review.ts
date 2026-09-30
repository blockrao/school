import { istCalendarDayDiff } from "@/lib/ist-date";

/**
 * Closes a real gap flagged 30 Sep 2026: `admission_notices` (populated by
 * both the crawler that discovers admission/disclosure pages on a school's
 * own site, and the school portal's "Post an admission notice" form) had a
 * `review` workflow — pending -> approved/rejected — that stopped at
 * `approved` and never wrote anything to `admission_cycles`. An "approved"
 * notice sat there having changed nothing the public page reads. This module
 * is the pure logic for turning one notice's `extraction` payload into
 * editable, ops-confirmed proposals for real `admission_cycles` rows.
 *
 * Two real extraction shapes exist in production today (checked directly
 * against live data, not assumed):
 * - The crawler's shape carries `extraction.cycles: [...]`, already
 *   normalized close to `admission_cycles`'s own columns (class_code,
 *   opens_on, closes_on, form_mode, registration_fee_inr, ...) — the
 *   overwhelming majority of usable rows.
 * - The portal form's shape (`submitAdmissionNotice`,
 *   src/app/portal/notices/new/actions.ts) is flatter: one cycle's worth of
 *   fields, `classes` as free text (school typed "Nursery, LKG, Class 1"),
 *   never a `class_code`.
 * Most crawled pages carry neither (contact info, fee PDFs, unreadable
 * scans) — `extractProposedCycles` returns `[]` for those, same as before:
 * nothing to publish, "Approve"/"Reject" (unchanged) is still the right
 * action for them.
 *
 * `classCode` is deliberately left `null` whenever the source didn't supply
 * one we can trust as one of the fixed `class_levels` codes (every portal-
 * form submission, and any crawler cycle whose class_code isn't recognized).
 * The review UI must force staff to pick one explicitly rather than guessing
 * from free text — the same "never fabricate a mapping" rule this codebase
 * already applies to `class_label_ambiguous`/`class_label_note` on the table
 * itself.
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
  /** "official" for a document the crawler found published on the school's
   * own site; "school_reported" for the portal form, which is the school
   * self-reporting to SchoolOye directly rather than a published document. */
  sourceType: "official" | "school_reported";
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

function fromCrawlerCycle(raw: unknown, knownClassCodes: ReadonlySet<string>): ProposedCycle {
  const c = (raw ?? {}) as Record<string, unknown>;
  const rawCode = asString(c.class_code);
  return {
    classCode: rawCode && knownClassCodes.has(rawCode) ? rawCode : null,
    classLabelHint: rawCode,
    academicYear: "", // filled in by the caller from extraction.academic_year — one value per notice, not per cycle
    opensOn: asString(c.opens_on),
    closesOn: asString(c.closes_on),
    resultsOn: asString(c.results_on),
    formMode: (() => {
      const m = asString(c.form_mode);
      return m && KNOWN_FORM_MODES.has(m) ? (m as ProposedCycle["formMode"]) : "unknown";
    })(),
    formUrl: asString(c.form_url),
    registrationFee: asNumber(c.registration_fee_inr),
    dobFrom: asString(c.dob_from),
    dobTo: asString(c.dob_to),
    documentsRequired: Array.isArray(c.documents_required)
      ? c.documents_required.filter((d): d is string => typeof d === "string")
      : null,
    selectionNotes: asString(c.selection_notes),
    classLabelAmbiguous: c.class_label_ambiguous === true,
    classLabelNote: asString(c.class_label_note),
    sourceType: "official",
  };
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

/** `[]` means nothing structured to publish — the existing plain Approve/Reject is still right for this notice. */
export function extractProposedCycles(
  extraction: unknown,
  knownClassCodes: ReadonlySet<string>,
): ProposedCycle[] {
  if (extraction === null || typeof extraction !== "object") return [];
  const e = extraction as Record<string, unknown>;

  if (Array.isArray(e.cycles) && e.cycles.length > 0) {
    const academicYear = asString(e.academic_year) ?? "";
    return e.cycles.map((raw) => ({ ...fromCrawlerCycle(raw, knownClassCodes), academicYear }));
  }

  // The portal form's flatter shape: distinguishable by having `session` +
  // `form_type`, fields the crawler's extraction never produces.
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
