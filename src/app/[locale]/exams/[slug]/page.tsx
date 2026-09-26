import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { getPublicAdmissionsByExamSlug } from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import type { EligibilityCycle } from "@/lib/eligibility";
import { istDateLabel } from "@/lib/ist-date";

const ELIGIBILITY_CHECKER_ID = "eligibility-checker";

// Shorter revalidate than other static pages: this page renders live
// deadline countdowns (DeadlineMargin/deadlineState depend on "now" at
// request time) — see CLAUDE.md's warning against baking a countdown into
// a long-lived cache. 15 minutes keeps the countdown practically accurate
// while still cutting the vast majority of repeat-request DB load.
export const revalidate = 900;

// design-pending — no Exam Hub screen exists in design/ yet. See docs/design-gaps.md.

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/exams/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cycles = await getPublicAdmissionsByExamSlug(slug);
  if (cycles.length === 0) return { title: "Not found" };

  const exam = cycles[0];
  const title = `${exam.name_en} — Dates, Eligibility & Application ${exam.academic_year} | SchoolOye`;
  const description = `${exam.name_en}${exam.conducting_body ? ` (${exam.conducting_body})` : ""}: application dates, eligibility, fees and the full admission timeline for ${exam.academic_year}, verified against the official notification.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/exams/${slug}`,
      languages: { "en-IN": `/en/exams/${slug}`, "hi-IN": `/hi/exams/${slug}` },
    },
  };
}

function classLabel(classCode: string): string {
  return `Class ${classCode.replace(/^c/, "")}`;
}

function MilestoneRow({ milestone }: { milestone: PublicExamMilestone }) {
  const starts = milestone.starts_on ? istDateLabel(new Date(milestone.starts_on)) : null;
  const ends = milestone.ends_on ? istDateLabel(new Date(milestone.ends_on)) : null;
  const dateLabel =
    starts && ends && starts !== ends ? `${starts} – ${ends}` : (starts ?? ends ?? "Date TBA");

  return (
    <li className="flex items-start gap-3 border-rule border-b py-3 last:border-b-0">
      <span className="mt-0.5 w-28 shrink-0 font-semibold text-meta text-ruled-blue">
        {dateLabel}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-body">{milestone.label_en}</span>
        {milestone.detail_en && (
          <span className="text-meta text-muted-ink">{milestone.detail_en}</span>
        )}
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

function FeeTiers({ cycle }: { cycle: PublicExamAdmission }) {
  if (cycle.fee_tiers.length === 0) return null;
  return (
    <div>
      <SectionHeading>Application fee</SectionHeading>
      <table className="w-full text-body">
        <tbody>
          {cycle.fee_tiers.map((tier) => (
            <tr key={tier.category_label_en} className="border-rule border-b last:border-b-0">
              <td className="py-1.5 pr-3 text-muted-ink">{tier.category_label_en}</td>
              <td className="py-1.5 text-right font-semibold">₹{tier.amount}</td>
            </tr>
          ))}
          {cycle.late_fee_amount != null && (
            <tr>
              <td className="py-1.5 pr-3 text-meta text-muted-ink">Late fee (extended window)</td>
              <td className="py-1.5 text-right text-meta text-muted-ink">
                ₹{cycle.late_fee_amount}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EligibilityNotes({ cycle }: { cycle: PublicExamAdmission }) {
  if (!cycle.eligibility_notes_en && !cycle.dob_from && !cycle.dob_to) return null;
  return (
    <div>
      <SectionHeading>Eligibility</SectionHeading>
      {(cycle.dob_from || cycle.dob_to) && (
        <p className="mb-1 text-body">
          Date of birth:{" "}
          <span className="font-semibold">
            {cycle.dob_from ? istDateLabel(new Date(cycle.dob_from)) : "—"} to{" "}
            {cycle.dob_to ? istDateLabel(new Date(cycle.dob_to)) : "—"}
          </span>{" "}
          <a href={`#${ELIGIBILITY_CHECKER_ID}`} className="font-semibold text-ruled-blue">
            Not sure? Check your eligibility ↓
          </a>
        </p>
      )}
      {cycle.eligibility_notes_en && (
        <p className="text-body text-muted-ink">{cycle.eligibility_notes_en}</p>
      )}
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

// The pattern jsonb is exam/class-specific free-form content — rendered
// defensively since its shape isn't (and shouldn't be) locked in the schema.
function ExamPattern({ pattern }: { pattern: unknown }) {
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
            <th className="py-1 pr-2 font-medium">Subject</th>
            <th className="py-1 pr-2 font-medium">Questions</th>
            <th className="py-1 pr-2 font-medium">Marks</th>
            <th className="py-1 font-medium">Qualifying</th>
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
      <SectionHeading>Exam pattern</SectionHeading>
      {typeof p.duration === "string" && (
        <p className="mb-2 text-meta text-muted-ink">Duration: {p.duration}</p>
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
        <p className="mt-2 text-meta text-muted-ink">Interview: {p.interview_marks} marks</p>
      )}
      {tieBreak && (
        <p className="mt-2 text-meta text-muted-ink">
          Tie-break order:{" "}
          {tieBreak
            .filter(isRow)
            .map((t) => String((t as Record<string, unknown>).subject_en))
            .join(" → ")}
        </p>
      )}
    </div>
  );
}

function Syllabus({ syllabus }: { syllabus: unknown }) {
  if (!Array.isArray(syllabus) || syllabus.length === 0) return null;
  return (
    <div>
      <SectionHeading>Syllabus</SectionHeading>
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

function ReservationSplits({ cycle }: { cycle: PublicExamAdmission }) {
  if (cycle.reservation_splits.length === 0) return null;
  return (
    <div>
      <SectionHeading>Seat reservation</SectionHeading>
      <ul className="flex flex-col gap-1 text-meta">
        {cycle.reservation_splits.map((split) => (
          <li
            key={`${split.level}-${split.group_label_en}`}
            className="flex justify-between gap-3 border-rule border-b py-1 last:border-b-0"
          >
            <span className="text-muted-ink">{split.group_label_en}</span>
            <span className="shrink-0 font-semibold">{split.share_text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CycleCard({ cycle, now }: { cycle: PublicExamAdmission; now: Date }) {
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
            {cycle.form_mode === "online" ? "Online form" : "Offline form"}
            {cycle.registration_fee != null ? ` · ₹${cycle.registration_fee}` : ""}
          </span>
          {cycle.form_url && (
            <a
              href={cycle.form_url}
              className="font-semibold text-meta text-ruled-blue"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              Application form ↗
            </a>
          )}
          <span className="text-meta text-muted-ink">
            Verified
            {cycle.last_checked_at ? ` · ${istDateLabel(new Date(cycle.last_checked_at))}` : ""}
          </span>
        </div>
      </div>

      <EligibilityNotes cycle={cycle} />
      <FeeTiers cycle={cycle} />
      <ReservationSplits cycle={cycle} />
      <ExamPattern pattern={cycle.pattern} />
      <Syllabus syllabus={cycle.syllabus} />

      {cycle.milestones.length > 0 && (
        <div>
          <SectionHeading>Full timeline</SectionHeading>
          <ol className="flex flex-col">
            {cycle.milestones.map((milestone) => (
              <MilestoneRow
                key={`${milestone.label_en}-${milestone.starts_on}`}
                milestone={milestone}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function ApplicationSteps({ steps }: { steps: PublicExamAdmission["application_steps"] }) {
  if (steps.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-card font-semibold">How to apply</h2>
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

function CorrectionsTable({ corrections }: { corrections: PublicExamCorrection[] }) {
  if (corrections.length === 0) return null;
  return (
    <section className="mt-8 rounded-md border border-rule bg-amber-50 p-4">
      <h2 className="mb-1 font-display text-card font-semibold">What other sites get wrong</h2>
      <p className="mb-3 text-meta text-muted-ink">
        These details are commonly published incorrectly elsewhere. Here's what the official
        bulletin actually says.
      </p>
      <table className="w-full text-meta">
        <thead>
          <tr className="border-rule border-b text-left text-muted-ink">
            <th className="py-1.5 pr-2 font-medium">Detail</th>
            <th className="py-1.5 pr-2 font-medium">Official</th>
            <th className="py-1.5 font-medium">Often published (wrong)</th>
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

function ExamCentres({ centres }: { centres: PublicExamCentre[] }) {
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
        Exam centres ({centres.length} cities)
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

function ParticipatingSchools({ schools }: { schools: PublicExamParticipatingSchool[] }) {
  if (schools.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-card font-semibold">Participating schools</h2>
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

function TrustBanner() {
  return (
    <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-meta text-amber-900">
      <strong>Beware of touts and agents.</strong> Admission to these schools is decided only
      through the official written exam and interview. No individual or agency can guarantee a seat
      for a fee — report anyone who claims otherwise.
    </div>
  );
}

function ContactBlock({ exam }: { exam: PublicExamAdmission }) {
  if (!exam.helpdesk_phone && !exam.helpdesk_email && !exam.info_site_url) return null;
  return (
    <section className="mt-8 rounded-md border border-rule p-4">
      <h2 className="mb-2 font-display text-card font-semibold">Helpdesk & official links</h2>
      <div className="flex flex-col gap-1 text-body">
        {exam.helpdesk_phone && <p>Phone: {exam.helpdesk_phone}</p>}
        {exam.helpdesk_email && (
          <p>
            Email:{" "}
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
              Official information bulletin ↗
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

function WhatsAppShare({ exam }: { exam: PublicExamAdmission }) {
  const text = `${exam.name_en} ${exam.academic_year} — dates, fees, syllabus & eligibility, verified: https://www.schooloye.com/en/exams/${exam.slug}`;
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 inline-flex items-center gap-2 rounded-md border border-rule px-3 py-1.5 font-semibold text-meta text-ruled-blue"
    >
      Share on WhatsApp ↗
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

export default async function ExamHubPage({ params }: PageProps<"/[locale]/exams/[slug]">) {
  const { locale, slug } = await params;
  const cycles = await getPublicAdmissionsByExamSlug(slug);
  if (cycles.length === 0) notFound();

  const exam = cycles[0];
  const now = new Date();
  const eligibilityCycles = toEligibilityCycles(cycles, now);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">{exam.name_en}</h1>
      {exam.name_hi && <p className="mt-1 text-body text-muted-ink">{exam.name_hi}</p>}
      <p className="mt-2 text-body text-muted-ink">
        {exam.conducting_body ?? "Conducted nationally"}
        {exam.official_site && (
          <>
            {" · "}
            <a
              href={exam.official_site}
              className="font-semibold text-ruled-blue"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              Official website ↗
            </a>
          </>
        )}
      </p>

      <TrustBanner />
      <WhatsAppShare exam={exam} />

      {eligibilityCycles.length > 0 && (
        <EligibilityChecker
          id={ELIGIBILITY_CHECKER_ID}
          cycles={eligibilityCycles}
          helpHref={`/${locale}/admissions/help`}
          shareHref={`https://wa.me/?text=${encodeURIComponent(
            `Check if your child is eligible for ${exam.name_en} ${exam.academic_year}: https://www.schooloye.com/${locale}/exams/${slug}#${ELIGIBILITY_CHECKER_ID}`,
          )}`}
          className="mt-6"
        />
      )}

      <div className="mt-6 flex flex-col gap-4">
        {cycles.map((cycle) => (
          <CycleCard key={cycle.cycle_id} cycle={cycle} now={now} />
        ))}
      </div>

      <ApplicationSteps steps={exam.application_steps} />
      <CorrectionsTable corrections={exam.corrections} />
      <ExamCentres centres={exam.centres} />
      <ParticipatingSchools schools={exam.participating_schools} />
      <ContactBlock exam={exam} />

      <p className="mt-6 text-meta text-muted-ink">
        Every date above is checked against the official notification before publishing — see the
        timeline for exactly when each stage was verified.
      </p>
    </div>
  );
}
