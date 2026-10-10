import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/ui/badges";
import { listPublicExams } from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { localeAlternates, localeCanonical } from "@/lib/seo";
import { classLabel } from "@/lib/text";
import { localePrefix } from "@/lib/urls";

const EDITORIAL_EXAMS = [
  { slug: "aissee", nameEn: "AISSEE — Sainik School Entrance Examination", conductingBody: "National Testing Agency / Sainik Schools Society", classCodes: ["6", "9"], academicYears: ["2026–27", "2027–28"] },
  { slug: "jnvst", nameEn: "JNVST — Jawahar Navodaya Vidyalaya Selection Test", conductingBody: "Navodaya Vidyalaya Samiti", classCodes: ["6", "9"], academicYears: ["2027–28"] },
  { slug: "rms-cet", nameEn: "RMS CET — Rashtriya Military Schools Common Entrance Test", conductingBody: "National Testing Agency / Ministry of Defence", classCodes: ["6", "9"], academicYears: ["2026"] },
] as const;

// Same reasoning as exams/[slug]: renders a live open/upcoming/closed status
// per exam, so keep the revalidate window short rather than caching a stale pill.
export const revalidate = 900;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/exams">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Entrance Exams — SchoolOye",
    description:
      "National and multi-school entrance exams: eligibility, dates, fees and how to apply — verified against each exam's official notification.",
    alternates: {
      canonical: localeCanonical(locale, "/exams"),
      languages: localeAlternates("/exams"),
    },
  };
}

export default async function ExamsIndexPage({ params }: PageProps<"/[locale]/exams">) {
  const { locale } = await params;
  const publishedExams = await listPublicExams();
  // Evergreen guides remain discoverable even when no cycle passes the public
  // verification gate. Cycle data itself still comes only from api.* views.
  const exams = publishedExams.length > 0 ? publishedExams : EDITORIAL_EXAMS.map((exam) => ({
    ...exam,
    soonestOpensOn: null,
    soonestClosesOn: null,
    lastCheckedAt: null,
  }));
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
          <Link href={`${localePrefix(locale)}/schools`} className="font-semibold text-ruled-blue">
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
                href={`${localePrefix(locale)}/exams/${exam.slug}`}
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
