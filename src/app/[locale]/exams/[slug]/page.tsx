import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EligibilityChecker } from "@/components/admissions/eligibility-checker";
import { StatusPill } from "@/components/ui/badges";
import { DeadlineMargin } from "@/components/ui/deadline-margin";
import type {
  PublicExamAdmission,
  PublicExamCentre,
  PublicExamCorrection,
  PublicExamMilestone,
  PublicExamParticipatingSchool,
} from "@/contracts";
import { getDictionary } from "@/i18n/dictionary";
import { t } from "@/i18n/t";
import { getPublicAdmissionsByExamSlug } from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import type { EligibilityCycle } from "@/lib/eligibility";
import { siteUrl } from "@/lib/env.server";
import { formatCurrency } from "@/lib/format";
import { examHasCompleteHindi } from "@/lib/i18n-completeness";
import { istDateLabel } from "@/lib/ist-date";
import { localeAlternates, localeCanonical } from "@/lib/seo";
import { classLabel } from "@/lib/text";
import { examPath, homePath, localePrefix } from "@/lib/urls";

const ELIGIBILITY_CHECKER_ID = "eligibility-checker";

// Shorter revalidate than other static pages: this page renders live
// deadline countdowns (DeadlineMargin/deadlineState depend on "now" at
// request time) — see CLAUDE.md's warning against baking a countdown into
// a long-lived cache. 15 minutes keeps the countdown practically accurate
// while still cutting the vast majority of repeat-request DB load.
export const revalidate = 900;

// design-pending — no Exam Hub screen exists in design/ yet. See docs/design-gaps.md.

/**
 * Picks the Hindi value for a field when the page is rendering in Hindi AND
 * that specific field actually has Hindi content, falling back to English
 * otherwise. Field-level, not page-level: some fields (pattern/syllabus/
 * corrections/participating-school names, none of which have a `_hi` column
 * yet) always fall back to English even on a fully Hindi-gated page — see
 * "SchoolOye Live Site Audit — Full Hindi parity" (30 Sep 2026) on why
 * English proper nouns/technical terms staying put inside Hindi copy is the
 * intended code-mixing style, not a gap.
 */
function pick(locale: string, en: string, hi: string | null | undefined): string {
  return locale === "hi" && hi ? hi : en;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/exams/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const cycles = await getPublicAdmissionsByExamSlug(slug);
  if (cycles.length === 0) return { title: "Not found" };

  const exam = cycles[0];
  const title = `${exam.name_en} — Dates, Eligibility & Application ${exam.academic_year} | SchoolOye`;
  const description = `${exam.name_en}${exam.conducting_body ? ` (${exam.conducting_body})` : ""}: application dates, eligibility, fees and the full admission timeline for ${exam.academic_year}, verified against the official notification.`;

  // Only advertise a Hindi alternate once every field on the page is
  // actually translated — see @/lib/i18n-completeness. Google (and,
  // per the 30 Sep audit, Gemini/Copilot which lean on Google/Bing
  // search) uses hreflang to route Hindi-language queries here; ChatGPT
  // and Perplexity don't reliably honour it, so real, cited Hindi
  // content still matters more than this tag for those two specifically.
  const translated = examHasCompleteHindi(cycles) ? (["hi"] as const) : [];

  return {
    title,
    description,
    alternates: {
      canonical: localeCanonical(locale, `/exams/${slug}`),
      languages: localeAlternates(`/exams/${slug}`, translated),
    },
  };
}

function MilestoneRow({ milestone, locale }: { milestone: PublicExamMilestone; locale: string }) {
  const starts = milestone.starts_on ? istDateLabel(new Date(milestone.starts_on)) : null;
  const ends = milestone.ends_on ? istDateLabel(new Date(milestone.ends_on)) : null;
  const dateLabel =
    starts && ends && starts !== ends
      ? `${starts} – ${ends}`
      : (starts ?? ends ?? pick(locale, "Date TBA", "तिथि घोषित होना बाकी"));
  const label = pick(locale, milestone.label_en, milestone.label_hi);
  const detail = pick(locale, milestone.detail_en ?? "", milestone.detail_hi);

  return (
    <li className="flex items-start gap-3 border-rule border-b py-3 last:border-b-0">
      <span className="mt-0.5 w-28 shrink-0 font-semibold text-meta text-ruled-blue">
        {dateLabel}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-body">{label}</span>
        {detail && <span className="text-meta text-muted-ink">{detail}</span>}
      </div>
    </li>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 font-display text-meta font-semibold uppercase tracking-wide text-muted-ink">
      {children}
    </h3>
  );
}

function FeeTiers({
  cycle,
  locale,
  dict,
}: {
  cycle: PublicExamAdmission;
  locale: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (cycle.fee_tiers.length === 0) return null;
  return (
    <div>
      <SectionHeading>{t(dict, "exam.application_fee")}</SectionHeading>
      <table className="w-full text-body">
        <tbody>
          {cycle.fee_tiers.map((tier) => (
            <tr key={tier.category_label_en} className="border-rule border-b last:border-b-0">
              <td className="py-1.5 pr-3 text-muted-ink">
                {pick(locale, tier.category_label_en, tier.category_label_hi)}
              </td>
              <td className="py-1.5 text-right font-semibold">{formatCurrency(tier.amount)}</td>
            </tr>
          ))}
          {cycle.late_fee_amount != null && (
            <tr>
              <td className="py-1.5 pr-3 text-meta text-muted-ink">{t(dict, "exam.late_fee")}</td>
              <td className="py-1.5 text-right text-meta text-muted-ink">
                {formatCurrency(cycle.late_fee_amount)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EligibilityNotes({
  cycle,
  locale,
  dict,
}: {
  cycle: PublicExamAdmission;
  locale: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (!cycle.eligibility_notes_en && !cycle.dob_from && !cycle.dob_to) return null;
  const notes = pick(locale, cycle.eligibility_notes_en ?? "", cycle.eligibility_notes_hi);
  return (
    <div>
      <SectionHeading>{t(dict, "exam.eligibility")}</SectionHeading>
      {(cycle.dob_from || cycle.dob_to) && (
        <p className="mb-1 text-body">
          {t(dict, "exam.date_of_birth")}{" "}
          <span className="font-semibold">
            {cycle.dob_from ? istDateLabel(new Date(cycle.dob_from)) : "—"} to{" "}
            {cycle.dob_to ? istDateLabel(new Date(cycle.dob_to)) : "—"}
          </span>{" "}
          <a href={`#${ELIGIBILITY_CHECKER_ID}`} className="font-semibold text-ruled-blue">
            {t(dict, "exam.check_eligibility_cta")}
          </a>
        </p>
      )}
      {notes && <p className="text-body text-muted-ink">{notes}</p>}
      {cycle.documents_required && cycle.documents_required.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-meta text-muted-ink">
          {cycle.documents_required.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectionNotes({
  cycle,
  dict,
}: {
  cycle: PublicExamAdmission;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (!cycle.selection_notes) return null;
  return (
    <div>
      <SectionHeading>{t(dict, "exam.how_merit_decided")}</SectionHeading>
      <p className="text-body text-muted-ink">{cycle.selection_notes}</p>
    </div>
  );
}

// The pattern jsonb is exam/class-specific free-form content — rendered
// defensively since its shape isn't (and shouldn't be) locked in the schema.
// No `_hi` variant exists for this content yet (30 Sep 2026 audit), so it
// always renders in English even on an otherwise-Hindi page — English
// technical/subject terms staying put inside Hindi copy is the intended
// code-mixing style here, not a gap; only the section chrome is localised.
function ExamPattern({
  pattern,
  dict,
}: {
  pattern: unknown;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (!pattern || typeof pattern !== "object") return null;
  const p = pattern as Record<string, unknown>;

  function isRow(v: unknown): v is {
    subject_en?: string;
    questions?: number | null;
    marks?: number;
    qualify_pct?: number | null;
    note_en?: string;
  } {
    return typeof v === "object" && v !== null;
  }

  function RowsTable({ rows }: { rows: unknown[] }) {
    return (
      <table className="w-full text-meta">
        <thead>
          <tr className="border-rule border-b text-left text-muted-ink">
            <th className="py-1 pr-2 font-medium">{t(dict, "exam.subject")}</th>
            <th className="py-1 pr-2 font-medium">{t(dict, "exam.questions")}</th>
            <th className="py-1 pr-2 font-medium">{t(dict, "exam.marks")}</th>
            <th className="py-1 font-medium">{t(dict, "exam.qualifying")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.filter(isRow).map((row) => (
            <tr key={row.subject_en} className="border-rule border-b last:border-b-0">
              <td className="py-1 pr-2">{row.subject_en}</td>
              <td className="py-1 pr-2">{row.questions ?? "—"}</td>
              <td className="py-1 pr-2">{row.marks ?? "—"}</td>
              <td className="py-1">
                {row.qualify_pct != null ? `${row.qualify_pct}%` : row.note_en ? row.note_en : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const rows = Array.isArray(p.rows) ? p.rows : null;
  const papers = Array.isArray(p.papers) ? p.papers : null;
  const tieBreak = Array.isArray(p.tie_break) ? p.tie_break : null;

  return (
    <div>
      <SectionHeading>{t(dict, "exam.exam_pattern")}</SectionHeading>
      {typeof p.duration === "string" && (
        <p className="mb-2 text-meta text-muted-ink">
          {t(dict, "exam.duration", { duration: p.duration })}
        </p>
      )}
      {rows && <RowsTable rows={rows} />}
      {papers && (
        <div className="flex flex-col gap-3">
          {papers.filter(isRow).map((paper) => (
            <div key={String(paper.subject_en ?? Math.random())}>
              {"name_en" in paper && (
                <p className="mb-1 font-semibold text-meta">
                  {String((paper as Record<string, unknown>).name_en)}
                  {"total_marks" in paper &&
                    ` — ${(paper as Record<string, unknown>).total_marks} marks`}
                  {"qualify_pct" in paper &&
                    ` (qualifying: ${(paper as Record<string, unknown>).qualify_pct}%)`}
                </p>
              )}
              {Array.isArray((paper as Record<string, unknown>).rows) && (
                <RowsTable rows={(paper as Record<string, unknown>).rows as unknown[]} />
              )}
            </div>
          ))}
        </div>
      )}
      {typeof p.interview_marks === "number" && (
        <p className="mt-2 text-meta text-muted-ink">
          {t(dict, "exam.interview_marks", { marks: p.interview_marks })}
        </p>
      )}
      {tieBreak && (
        <p className="mt-2 text-meta text-muted-ink">
          {t(dict, "exam.tie_break_order", {
            order: tieBreak
              .filter(isRow)
              .map((tRow) => String((tRow as Record<string, unknown>).subject_en))
              .join(" → "),
          })}
        </p>
      )}
    </div>
  );
}

// No `_hi` variant exists for syllabus topic lists yet — same code-mixing
// rationale as ExamPattern above; only the "Syllabus" heading is localised.
function Syllabus({
  syllabus,
  dict,
}: {
  syllabus: unknown;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (!Array.isArray(syllabus) || syllabus.length === 0) return null;
  return (
    <div>
      <SectionHeading>{t(dict, "exam.syllabus")}</SectionHeading>
      <div className="flex flex-col gap-3">
        {syllabus.map((entry) => {
          if (typeof entry !== "object" || entry === null) return null;
          const subject = String((entry as Record<string, unknown>).subject_en ?? "");
          const topics = (entry as Record<string, unknown>).topics_en;
          if (!Array.isArray(topics)) return null;
          return (
            <div key={subject}>
              <p className="mb-1 font-semibold text-meta">{subject}</p>
              <p className="text-meta text-muted-ink">{topics.join(", ")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReservationSplits({
  cycle,
  locale,
  dict,
}: {
  cycle: PublicExamAdmission;
  locale: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (cycle.reservation_splits.length === 0) return null;
  return (
    <div>
      <SectionHeading>{t(dict, "exam.seat_reservation")}</SectionHeading>
      <ul className="flex flex-col gap-1 text-meta">
        {cycle.reservation_splits.map((split) => (
          <li
            key={`${split.level}-${split.group_label_en}`}
            className="flex justify-between gap-3 border-rule border-b py-1 last:border-b-0"
          >
            <span className="text-muted-ink">
              {pick(locale, split.group_label_en, split.group_label_hi)}
            </span>
            <span className="shrink-0 font-semibold">{split.share_text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CycleCard({
  cycle,
  now,
  locale,
  dict,
}: {
  cycle: PublicExamAdmission;
  now: Date;
  locale: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  const margin = deadlineState(
    {
      opensAt: cycle.opens_on ? new Date(cycle.opens_on) : null,
      closesAt: cycle.closes_on ? new Date(cycle.closes_on) : null,
    },
    now,
  );
  const pill = deadlineToPill(margin);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-rule p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-card font-semibold">
          {classLabel(cycle.class_code)} · {cycle.academic_year}
        </h2>
        <StatusPill status={pill.status}>{pill.label}</StatusPill>
      </div>

      <div className="flex items-center gap-3">
        <DeadlineMargin
          opensAt={cycle.opens_on ? new Date(cycle.opens_on) : null}
          closesAt={cycle.closes_on ? new Date(cycle.closes_on) : null}
          now={now}
          className="h-20 w-32 shrink-0"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-meta text-muted-ink">
            {cycle.form_mode === "online"
              ? t(dict, "exam.online_form")
              : t(dict, "exam.offline_form")}
            {cycle.registration_fee != null ? ` · ${formatCurrency(cycle.registration_fee)}` : ""}
          </span>
          {cycle.form_url && (
            <a
              href={cycle.form_url}
              className="font-semibold text-meta text-ruled-blue"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {t(dict, "exam.application_form")}
            </a>
          )}
          <span className="text-meta text-muted-ink">
            {t(dict, "exam.verified")}
            {cycle.last_checked_at ? ` · ${istDateLabel(new Date(cycle.last_checked_at))}` : ""}
          </span>
        </div>
      </div>

      <EligibilityNotes cycle={cycle} locale={locale} dict={dict} />
      <FeeTiers cycle={cycle} locale={locale} dict={dict} />
      <ReservationSplits cycle={cycle} locale={locale} dict={dict} />
      <ExamPattern pattern={cycle.pattern} dict={dict} />
      <SelectionNotes cycle={cycle} dict={dict} />
      <Syllabus syllabus={cycle.syllabus} dict={dict} />

      {cycle.milestones.length > 0 && (
        <div>
          <SectionHeading>{t(dict, "exam.full_timeline")}</SectionHeading>
          <ol className="flex flex-col">
            {cycle.milestones.map((milestone) => (
              <MilestoneRow
                key={`${milestone.label_en}-${milestone.starts_on}`}
                milestone={milestone}
                locale={locale}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// No `_hi` variant exists for application-step copy yet — only the section
// heading is localised (see ExamPattern's comment above for the rationale).
function ApplicationSteps({
  steps,
  dict,
}: {
  steps: PublicExamAdmission["application_steps"];
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (steps.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-card font-semibold">{t(dict, "exam.how_to_apply")}</h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={step.title_en} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ruled-blue font-semibold text-meta text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-body">{step.title_en}</p>
              <p className="text-meta text-muted-ink">{step.detail_en}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// No `_hi` variant exists for this fact-check content yet — only the section
// chrome is localised (see ExamPattern's comment above for the rationale).
function CorrectionsTable({
  corrections,
  dict,
}: {
  corrections: PublicExamCorrection[];
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (corrections.length === 0) return null;
  return (
    <section className="mt-8 rounded-md border border-rule bg-amber-50 p-4">
      <h2 className="mb-1 font-display text-card font-semibold">
        {t(dict, "exam.what_others_get_wrong")}
      </h2>
      <p className="mb-3 text-meta text-muted-ink">{t(dict, "exam.what_others_get_wrong_desc")}</p>
      <table className="w-full text-meta">
        <thead>
          <tr className="border-rule border-b text-left text-muted-ink">
            <th className="py-1.5 pr-2 font-medium">{t(dict, "exam.detail")}</th>
            <th className="py-1.5 pr-2 font-medium">{t(dict, "exam.official")}</th>
            <th className="py-1.5 font-medium">{t(dict, "exam.often_published_wrong")}</th>
          </tr>
        </thead>
        <tbody>
          {corrections.map((c) => (
            <tr key={c.item_en} className="border-rule border-b last:border-b-0">
              <td className="py-1.5 pr-2 font-medium">{c.item_en}</td>
              <td className="py-1.5 pr-2 font-semibold text-ruled-blue">{c.official_en}</td>
              <td className="py-1.5 text-muted-ink line-through decoration-red-400">
                {c.often_published_en}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ExamCentres({
  centres,
  dict,
}: {
  centres: PublicExamCentre[];
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (centres.length === 0) return null;
  const byState = new Map<string, PublicExamCentre[]>();
  for (const c of centres) {
    const list = byState.get(c.state) ?? [];
    list.push(c);
    byState.set(c.state, list);
  }
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-card font-semibold">
        {t(dict, "exam.exam_centres", { count: centres.length })}
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from(byState.entries()).map(([state, list]) => (
          <div key={state}>
            <p className="mb-1 font-semibold text-meta">{state}</p>
            <p className="text-meta text-muted-ink">{list.map((c) => c.city_name).join(", ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ParticipatingSchools({
  schools,
  dict,
}: {
  schools: PublicExamParticipatingSchool[];
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (schools.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-card font-semibold">
        {t(dict, "exam.participating_schools")}
      </h2>
      <ul className="flex flex-col gap-1">
        {schools.map((school) => (
          <li
            key={school.name_en}
            className="flex justify-between gap-3 border-rule border-b py-1.5 text-body last:border-b-0"
          >
            <span>{school.name_en}</span>
            <span className="text-meta text-muted-ink">{school.state}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrustBanner({ dict }: { dict: Awaited<ReturnType<typeof getDictionary>> }) {
  return (
    <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-meta text-amber-900">
      {t(dict, "exam.touts_warning")}
    </div>
  );
}

function ContactBlock({
  exam,
  dict,
}: {
  exam: PublicExamAdmission;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  if (!exam.helpdesk_phone && !exam.helpdesk_email && !exam.info_site_url) return null;
  return (
    <section className="mt-8 rounded-md border border-rule p-4">
      <h2 className="mb-2 font-display text-card font-semibold">
        {t(dict, "exam.helpdesk_heading")}
      </h2>
      <div className="flex flex-col gap-1 text-body">
        {exam.helpdesk_phone && <p>{t(dict, "exam.phone", { phone: exam.helpdesk_phone })}</p>}
        {exam.helpdesk_email && (
          <p>
            {t(dict, "exam.email")}{" "}
            <a href={`mailto:${exam.helpdesk_email}`} className="font-semibold text-ruled-blue">
              {exam.helpdesk_email}
            </a>
          </p>
        )}
        {exam.info_site_url && (
          <p>
            <a
              href={exam.info_site_url}
              className="font-semibold text-ruled-blue"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {t(dict, "exam.official_bulletin")}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

function WhatsAppShare({
  exam,
  locale,
  dict,
}: {
  exam: PublicExamAdmission;
  locale: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  const text = t(dict, "exam.whatsapp_share_text", {
    name: pick(locale, exam.name_en, exam.name_hi),
    year: exam.academic_year,
    url: `${siteUrl}${examPath(locale, exam.slug)}`,
  });
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 inline-flex items-center gap-2 rounded-md border border-rule px-3 py-1.5 font-semibold text-meta text-ruled-blue"
    >
      {t(dict, "exam.share_whatsapp")}
    </a>
  );
}

function toEligibilityCycles(cycles: PublicExamAdmission[], now: Date): EligibilityCycle[] {
  return cycles
    .filter((cycle) => cycle.dob_from && cycle.dob_to)
    .map((cycle) => {
      const margin = deadlineState(
        {
          opensAt: cycle.opens_on ? new Date(cycle.opens_on) : null,
          closesAt: cycle.closes_on ? new Date(cycle.closes_on) : null,
        },
        now,
      );
      const pill = deadlineToPill(margin);
      return {
        id: cycle.cycle_id,
        label: `${classLabel(cycle.class_code)} · ${cycle.academic_year}`,
        dobFrom: cycle.dob_from,
        dobTo: cycle.dob_to,
        applyStatus: pill.status,
        formUrl: cycle.form_url,
      };
    });
}

// Structured data. Exam pages were the one page type on the site without any
// JSON-LD (SchoolOye Live Site Audit, 30 Sep 2026) — BreadcrumbList mirrors
// the pattern already used on school/news/jobs/events pages; Event uses the
// OnlineEventAttendanceMode + VirtualLocation workaround already agreed for
// exam-day schema (schema.org requires a location; the exam is administered
// at many physical centres, so a single postal address would be wrong).
function examBreadcrumbJsonLd(locale: string, slug: string, nameEn: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}${homePath(locale)}` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Entrance Exams",
        item: `${siteUrl}${localePrefix(locale)}/exams`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: nameEn,
        item: `${siteUrl}${examPath(locale, slug)}`,
      },
    ],
  };
}

function examDateMilestone(cycle: PublicExamAdmission): PublicExamMilestone | undefined {
  return cycle.milestones.find((milestone) => /exam date|written exam/i.test(milestone.label_en));
}

function cycleEventJsonLd(cycle: PublicExamAdmission, locale: string, slug: string) {
  const milestone = examDateMilestone(cycle);
  const examDate = milestone?.starts_on ?? milestone?.ends_on;
  if (!examDate) return null;

  const url = `${siteUrl}${examPath(locale, slug)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${cycle.name_en} — ${classLabel(cycle.class_code)} ${cycle.academic_year}`,
    startDate: examDate,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "VirtualLocation", url },
    url,
    description: `${cycle.name_en} written examination for ${classLabel(cycle.class_code)}, ${cycle.academic_year}. Verified against the official notification.`,
    ...(cycle.conducting_body
      ? { organizer: { "@type": "Organization", name: cycle.conducting_body } }
      : {}),
  };
}

export default async function ExamHubPage({ params }: PageProps<"/[locale]/exams/[slug]">) {
  const { locale, slug } = await params;
  const cycles = await getPublicAdmissionsByExamSlug(slug);
  if (cycles.length === 0) notFound();

  // Per-exam Hindi gate, enforced again here (not just in generateMetadata's
  // hreflang): proxy.ts now passes every /hi/exams/* request through to this
  // page rather than blanket-redirecting (2026-09-30), so THIS is the one
  // place standing between an incomplete translation and a visibly
  // half-English "Hindi" page. Same completeness check as the hreflang tag,
  // for the same reason — see @/lib/i18n-completeness.
  if (locale === "hi" && !examHasCompleteHindi(cycles)) {
    redirect(examPath("en", slug));
  }

  const dict = await getDictionary(locale);
  const exam = cycles[0];
  const now = new Date();
  const eligibilityCycles = toEligibilityCycles(cycles, now);
  const breadcrumbJsonLd = examBreadcrumbJsonLd(locale, slug, exam.name_en);
  const eventJsonLds = cycles
    .map((cycle) => cycleEventJsonLd(cycle, locale, slug))
    .filter((event): event is NonNullable<typeof event> => event !== null);
  const examName = pick(locale, exam.name_en, exam.name_hi);
  const otherName = locale === "hi" ? exam.name_en : exam.name_hi;
  // Visible EN/HI toggle for this one page — see locale-switcher.tsx: the
  // header's toggle stays a permanent no-op site-wide (it's a sibling of
  // page content in [locale]/layout.tsx, so it has no way to know whether
  // THIS page has a translation), and its own comment already calls for the
  // real toggle to live per-page instead, linking to /hi/... only where
  // that translation is actually published. RMS CET is the first exam to
  // reach that bar (2026-09-30).
  const hindiAvailable = locale === "hi" || examHasCompleteHindi(cycles);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {eventJsonLds.map((event, i) => (
        <script
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-order, non-reorderable script tags
          key={i}
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(event) }}
        />
      ))}
      <h1 className="font-display text-title-m md:text-title-d">{examName}</h1>
      {otherName && <p className="mt-1 text-body text-muted-ink">{otherName}</p>}
      {hindiAvailable && (
        <p className="mt-1">
          <a
            href={examPath(locale === "hi" ? "en" : "hi", slug)}
            className="font-semibold text-meta text-ruled-blue"
          >
            {locale === "hi" ? t(dict, "exam.read_in_english") : t(dict, "exam.read_in_hindi")}
          </a>
        </p>
      )}
      <p className="mt-2 text-body text-muted-ink">
        {exam.conducting_body ?? t(dict, "exam.conducted_nationally")}
        {exam.official_site && (
          <>
            {" · "}
            <a
              href={exam.official_site}
              className="font-semibold text-ruled-blue"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {t(dict, "exam.official_website")}
            </a>
          </>
        )}
      </p>

      <TrustBanner dict={dict} />
      <WhatsAppShare exam={exam} locale={locale} dict={dict} />

      {eligibilityCycles.length > 0 && (
        <EligibilityChecker
          id={ELIGIBILITY_CHECKER_ID}
          cycles={eligibilityCycles}
          helpHref={`${localePrefix(locale)}/admissions/help`}
          shareHref={`https://wa.me/?text=${encodeURIComponent(
            t(dict, "exam.eligibility_share_text", {
              name: examName,
              year: exam.academic_year,
              url: `${siteUrl}${examPath(locale, slug)}#${ELIGIBILITY_CHECKER_ID}`,
            }),
          )}`}
          className="mt-6"
        />
      )}

      <div className="mt-6 flex flex-col gap-4">
        {cycles.map((cycle) => (
          <CycleCard key={cycle.cycle_id} cycle={cycle} now={now} locale={locale} dict={dict} />
        ))}
      </div>

      <ApplicationSteps steps={exam.application_steps} dict={dict} />
      <CorrectionsTable corrections={exam.corrections} dict={dict} />
      <ExamCentres centres={exam.centres} dict={dict} />
      <ParticipatingSchools schools={exam.participating_schools} dict={dict} />
      <ContactBlock exam={exam} dict={dict} />

      <p className="mt-6 text-meta text-muted-ink">{t(dict, "exam.verified_footer_note")}</p>
    </div>
  );
}
