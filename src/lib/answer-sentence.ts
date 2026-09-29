import { deadlineState } from "@/lib/deadline";
import { formatDate } from "@/lib/format";
import { titleCase } from "@/lib/text";

/**
 * AI/Search Answer-Sentence Pattern v1 (29 Sep 2026) — draft for the
 * Admissions section, reviewed with Prav before rolling the pattern to other
 * sections.
 *
 * Why this exists: the page currently states facts as a `dt`/`dd` table
 * (label -> value). Answer engines (Google AI Overviews, ChatGPT, Perplexity)
 * don't read a page's prose so much as extract short, self-contained blocks
 * they can quote without the surrounding context — a table cell doesn't
 * survive that extraction as a coherent claim ("Closes 31 Oct 2026" quoted
 * alone answers nothing; "closes 31 Oct 2026" *for what, at which school* is
 * lost). A single plain-English sentence that names the school, the class,
 * the session and the actual date carries its own context and is what
 * actually gets lifted into an answer.
 *
 * Ground rules (same SDP-31 discipline as everywhere else on this page):
 * - Never invents a date, session or status the DB doesn't actually have.
 * - Every branch traces to a real, distinguishable knowledge state — no
 *   "smoothing over" a null into a guess.
 * - Reuses `deadlineState` (IST-calendar-day, already the single source of
 *   truth for "is this deadline actually still live") rather than
 *   re-deriving open/closed/upcoming independently — this file must never
 *   disagree with what the Admissions section's own deadline pill says.
 * - Says nothing about how to apply (SchoolOye enquiry vs. the school's own
 *   form) — that distinction lives in the CTA, not the answer sentence, so
 *   this never mislabels a SchoolOye lead as a binding school application.
 */

/**
 * Admission-cycle class codes include both `c<N>` (regular grades) and named
 * early-years stages that don't fit that pattern. Unlike `grades.ts`'s
 * `classCodeToLabel` (which only ever sees `min_class`/`max_class` today and
 * returns null for anything outside `c<N>`, by design), this file's input
 * (`admission_cycles.class_code`) already has real "nursery" values in
 * production (confirmed live, Lancer's Convent SR Sec School) — so it needs
 * an actual mapping, not just a null fallback. An unrecognized code still
 * never becomes a guess: it falls back to itself, title-cased, which is
 * always at least readable and never fabricates a grade that isn't there.
 */
const NAMED_ADMISSION_CLASS_CODES: Record<string, string> = {
  nursery: "Nursery",
  lkg: "LKG",
  ukg: "UKG",
  prep: "Prep",
};

export function admissionClassLabel(classCode: string): string {
  const named = NAMED_ADMISSION_CLASS_CODES[classCode.toLowerCase()];
  if (named) return named;
  const numeric = /^c(\d+)$/.exec(classCode);
  if (numeric) return `Class ${numeric[1]}`;
  return titleCase(classCode);
}

const ANSWER_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export type AdmissionsAnswerAdmission = {
  academic_year: string;
  class_code: string;
  opens_on: string | null;
  closes_on: string | null;
};

/**
 * The one function this file exists for: a single, self-contained sentence
 * answering "what's the admission status/dates for this school." `admission`
 * should be whatever `selectPrimaryAdmission` already picked as the primary
 * cycle — this function doesn't re-decide which cycle is primary, only how
 * to phrase the one it's handed.
 */
export function buildAdmissionsAnswer(
  schoolName: string,
  admission: AdmissionsAnswerAdmission | null,
  now: Date,
): string {
  if (!admission) {
    return `Admission dates for ${schoolName} have not yet been published on SchoolOye.`;
  }

  const classLabel = admissionClassLabel(admission.class_code);
  const session = admission.academic_year;
  const state = deadlineState(
    {
      opensAt: admission.opens_on ? new Date(admission.opens_on) : null,
      closesAt: admission.closes_on ? new Date(admission.closes_on) : null,
    },
    now,
  );

  switch (state.status) {
    case "not-announced":
      return `Admission dates for ${classLabel} at ${schoolName} (${session}) have not yet been published.`;

    case "closed":
      return `Admissions for ${classLabel} at ${schoolName} (${session}) closed on ${formatDate(
        // Non-null: deadlineState only returns "closed" when closesAt was given.
        admission.closes_on as string,
        ANSWER_DATE_FORMAT,
      )}.`;

    case "upcoming":
      return `Admissions for ${classLabel} at ${schoolName} (${session}) open on ${formatDate(
        admission.opens_on as string,
        ANSWER_DATE_FORMAT,
      )}.`;

    case "open":
    case "closing-soon":
    case "deadline-day":
      return `${schoolName} is accepting ${classLabel} admissions for ${session}, open until ${formatDate(
        admission.closes_on as string,
        ANSWER_DATE_FORMAT,
      )}.`;

    case "open-no-deadline":
      return `${schoolName} is accepting ${classLabel} admissions for ${session}; no closing date has been announced yet.`;

    // deadlineState's seats-now branch only fires when a `seatsNow` input is
    // passed, which this function never does — unreachable here, but the
    // switch must still be exhaustive against DeadlineState's full type.
    default:
      return `Admission dates for ${classLabel} at ${schoolName} (${session}) have not yet been published.`;
  }
}
