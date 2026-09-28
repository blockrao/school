import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/state-message";
import { getSelectedCityArea } from "@/lib/db/public-adapter";
import { listPublicTeacherSubjects, listPublicTeachers } from "@/lib/db/teachers";
import { localeAlternates, localeCanonical } from "@/lib/seo";
import { localePrefix } from "@/lib/urls";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/teachers">): Promise<Metadata> {
  const { locale } = await params;
  const area = await getSelectedCityArea();
  const label = area?.cityName ?? "your city";
  return {
    title: `Teachers in ${label} — SchoolOye`,
    description: `Find teachers in ${label} by subject and school.`,
    alternates: {
      canonical: localeCanonical(locale, "/teachers"),
      languages: localeAlternates("/teachers"),
    },
  };
}

export default async function TeachersDirectoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/teachers">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const subject = first(rawSearchParams.subject);

  const [teachers, subjects, area] = await Promise.all([
    listPublicTeachers({ subject }),
    listPublicTeacherSubjects(),
    getSelectedCityArea(),
  ]);
  const cityLabel = area?.cityName ?? "your city";

  function subjectHref(s?: string) {
    const qs = s ? `?subject=${encodeURIComponent(s)}` : "";
    return `${localePrefix(locale)}/teachers${qs}`;
  }

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Find teachers in {cityLabel}</h1>

      {subjects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={subjectHref()}
            className={`flex h-11 items-center rounded-full border px-3.5 text-meta font-semibold ${
              !subject ? "border-ruled-blue bg-pill-results-bg text-ruled-blue" : "border-line-blue"
            }`}
          >
            All
          </Link>
          {subjects.map((s) => (
            <Link
              key={s}
              href={subjectHref(s)}
              className={`flex h-11 items-center rounded-full border px-3.5 text-meta font-semibold ${
                subject === s
                  ? "border-ruled-blue bg-pill-results-bg text-ruled-blue"
                  : "border-line-blue"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-4 text-meta text-muted-ink">
        {teachers.length} teacher{teachers.length === 1 ? "" : "s"}
        {subject ? ` · ${subject}` : ""} · all profiles created by the teacher themselves
      </p>

      {teachers.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {teachers.map((t) => (
            <Link
              key={t.id}
              href={`${localePrefix(locale)}/teacher/${t.id}-${t.slug}`}
              className="flex gap-3 rounded-md border border-rule bg-copy-white p-3.5 hover:border-ruled-blue"
            >
              <div className="flex h-19 w-16 shrink-0 items-center justify-center rounded-md bg-margin-paper text-meta text-muted-ink">
                Photo
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-card font-semibold">{t.full_name}</span>
                <span className="text-meta">
                  {[t.subject, t.level].filter(Boolean).join(" · ")}
                </span>
                {t.primary_school_name && (
                  <span className="text-meta text-muted-ink">{t.primary_school_name}</span>
                )}
                {t.headline && <span className="mt-0.5 text-meta">{t.headline}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={
              subject ? `No ${subject} teachers have joined yet` : "No teachers have joined yet"
            }
            description="Teachers appear here only after they create their own profile and choose to be listed. We don't list anyone without their consent."
            nextStepLabel="I'm a teacher: create my profile"
            nextStepHref={`${localePrefix(locale)}/teachers/create`}
          />
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 rounded-md border border-rule p-4">
        <div>
          <span className="font-display text-card font-semibold">Teach in {cityLabel}?</span>
          <p className="text-meta text-muted-ink">
            Create a free profile. You choose what's public.
          </p>
        </div>
        <Link
          href={`${localePrefix(locale)}/teachers/create`}
          className="flex h-11 shrink-0 items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
        >
          Create your profile
        </Link>
      </div>

      <p className="mt-4 text-meta text-muted-ink">
        No ratings or rankings. Order is alphabetical.
      </p>
    </div>
  );
}
