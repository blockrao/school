import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/ui/badges";
import { listPublicExams } from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { classLabel } from "@/lib/text";

// Same reasoning as exams/[slug]: renders a live open/upcoming/closed status
// per exam, so keep the revalidate window short rather than caching a stale pill.
export const revalidate = 900;

export function generateMetadata(): Metadata {
  return {
    title: "Entrance Exams — SchoolOye",
    description:
      "National and multi-school entrance exams: eligibility, dates, fees and how to apply — verified against each exam's official notification.",
    alternates: {
      canonical: "/exams",
      languages: { "en-IN": "/en/exams", "hi-IN": "/hi/exams" },
    },
  };
}

export default async function ExamsIndexPage({ params }: PageProps<"/[locale]/exams">) {
  const { locale } = await params;
  const exams = await listPublicExams();
  const now = new Date();

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Entrance Exams</h1>
      <p className="mt-2 text-body text-muted-ink">
        Eligibility, dates, fees and how to apply — verified against each exam's official
        notification, not summarized secondhand.
      </p>

      {exams.length === 0 ? (
        <p className="mt-8 text-body text-muted-ink">
          No exams published yet. Check back soon, or{" "}
          <Link href={`/${locale}/schools`} className="font-semibold text-ruled-blue">
            browse schools
          </Link>{" "}
          in the meantime.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {exams.map((exam) => {
            const state = deadlineState(
              {
                opensAt: exam.soonestOpensOn ? new Date(exam.soonestOpensOn) : null,
                closesAt: exam.soonestClosesOn ? new Date(exam.soonestClosesOn) : null,
              },
              now,
            );
            const pill = deadlineToPill(state);
            const classes = exam.classCodes.map(classLabel).join(", ");

            return (
              <Link
                key={exam.slug}
                href={`/${locale}/exams/${exam.slug}`}
                className="flex flex-col gap-2 rounded-md border border-rule p-4 hover:border-ruled-blue"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-card font-semibold">{exam.nameEn}</span>
                  <StatusPill status={pill.status}>{pill.label}</StatusPill>
                </div>
                <p className="text-body text-muted-ink">
                  {classes}
                  {exam.conductingBody ? ` · ${exam.conductingBody}` : ""}
                  {" · "}
                  {exam.academicYears[0]}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
