import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/ui/badges";
import { DeadlineMargin } from "@/components/ui/deadline-margin";
import type { PublicExamAdmission, PublicExamMilestone } from "@/contracts";
import { getPublicAdmissionsByExamSlug } from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { istDateLabel } from "@/lib/ist-date";

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

      {cycle.milestones.length > 0 && (
        <div>
          <h3 className="mb-1 font-display text-meta font-semibold uppercase tracking-wide text-muted-ink">
            Full timeline
          </h3>
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

export default async function ExamHubPage({ params }: PageProps<"/[locale]/exams/[slug]">) {
  const { slug } = await params;
  const cycles = await getPublicAdmissionsByExamSlug(slug);
  if (cycles.length === 0) notFound();

  const exam = cycles[0];
  const now = new Date();

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

      <div className="mt-6 flex flex-col gap-4">
        {cycles.map((cycle) => (
          <CycleCard key={cycle.cycle_id} cycle={cycle} now={now} />
        ))}
      </div>

      <p className="mt-6 text-meta text-muted-ink">
        Every date above is checked against the official notification before publishing — see the
        timeline for exactly when each stage was verified.
      </p>
    </div>
  );
}
