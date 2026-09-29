import { deadlineState } from "@/lib/deadline";
import { formatDate } from "@/lib/format";
import type { SchoolActivityItem } from "@/lib/school-activity";
import { titleCase } from "@/lib/text";

/**
 * AI/Search Answer-Sentence Pattern v1 (29 Sep 2026).
 *
 * Why this exists: the page currently states facts as a `dt`/`dd` table
 * (label -> value) or as fragments joined only by CSS layout (a pill, a date
 * span, a location span). Answer engines (Google AI Overviews, ChatGPT,
 * Perplexity) don't read a page's prose so much as extract short,
 * self-contained blocks they can quote without the surrounding context — a
 * table cell or a bare date span doesn't survive that extraction as a
 * coherent claim ("Closes 31 Oct 2026" quoted alone answers nothing; "closes
 * 31 Oct 2026" *for what, at which school* is lost). A single plain-English
 * sentence that names the school and the actual fact carries its own context
 * and is what actually gets lifted into an answer.
 *
 * **Reframed 29 Sep 2026 (Prav):** the first draft of this file led with
 * Admissions, but admissions is the wrong thing to optimize first — a given
 * parent hits it once every few years. `buildActivityAnswer` below (News/
 * Events/Jobs, via the existing "What's happening" feed) is the actual
 * priority: it's the part of the page that changes and gets asked about all
 * year, every year, which is what makes a page worth an answer engine citing
 * repeatedly rather than once. `buildAdmissionsAnswer` stays — admissions is
 * still a real, high-stakes query type — but it's the second component here,
 * not the lead.
 *
 * Ground rules (same SDP-31 discipline as everywhere else on this page):
 * - Never invents a date, status or fact the DB doesn't actually have.
 * - Every branch traces to a real, distinguishable knowledge state — no
 *   "smoothing over" a null into a guess.
 * - Reuses each domain's own existing status logic (`deadlineState` for
 *   admissions; `SchoolActivityItem.status`, already computed once by
 *   `buildSchoolActivityFeed` from `eventTemporalStatus`/`jobStatus`, for
 *   activity) rather than re-deriving status independently — this file must
 *   never disagree with what the section's own pill/label already says.
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

/**
 * The recurring, sticky counterpart to `buildAdmissionsAnswer` above — one
 * sentence per News/Event/Job item in the "What's happening" feed
 * (`school-activity.ts`). This is the content that actually changes through
 * the year, so it's what makes the page worth a repeat visit (or a repeat AI
 * citation), unlike admissions. Takes a `SchoolActivityItem` directly (the
 * exact shape `buildSchoolActivityFeed` already produces and
 * `ActivityFeedItem` already renders) so this never recomputes status
 * independently and can never drift from what the card itself shows.
 */
export function buildActivityAnswer(schoolName: string, item: SchoolActivityItem): string {
  switch (item.kind) {
    case "news": {
      const post = item.data;
      const date = formatDate(post.published_at, ANSWER_DATE_FORMAT);
      // The school-authored `body` is often already prose, but a headline +
      // bare date span (as currently rendered) isn't one coherent, quotable
      // unit by itself — this sentence exists to give it one, regardless of
      // how the authored body itself is structured.
      return `${schoolName} announced on ${date}: ${post.title}.`;
    }

    case "event": {
      const event = item.data;
      const date = formatDate(event.starts_at, ANSWER_DATE_FORMAT);
      const at = event.location ? ` at ${event.location}` : "";
      switch (item.status) {
        case "cancelled":
          return `${schoolName}'s ${event.title}, originally scheduled for ${date}${at}, was cancelled.`;
        case "ongoing":
          return `${schoolName}'s ${event.title}${at} is happening now (started ${date}).`;
        case "completed":
          return `${schoolName} held ${event.title} on ${date}${at}.`;
        default:
          return `${schoolName} is holding ${event.title} on ${date}${at}.`;
      }
    }

    case "job": {
      const job = item.data;
      const role = job.subject ? `${job.title} (${job.subject})` : job.title;
      switch (item.status) {
        case "filled":
          return `The ${role} position at ${schoolName} has been filled.`;
        case "closed":
          return `Applications for the ${role} position at ${schoolName} have closed.`;
        case "cancelled":
          return `${schoolName} withdrew its ${role} posting.`;
        default:
          return job.closes_at
            ? `${schoolName} is hiring for ${role}, applications close ${formatDate(
                job.closes_at,
                ANSWER_DATE_FORMAT,
              )}.`
            : `${schoolName} is hiring for ${role}.`;
      }
    }

    default: {
      const exhaustive: never = item;
      throw new Error(`Unhandled SchoolActivityItem kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}
