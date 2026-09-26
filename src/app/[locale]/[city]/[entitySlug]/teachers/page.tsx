import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { EmptyState } from "@/components/ui/state-message";
import { listPublicSchoolTeam } from "@/lib/db/school-team";
import { schoolPath } from "@/lib/school-url";
import { resolveEntity } from "../resolve";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[city]/[entitySlug]/teachers">): Promise<Metadata> {
  const { city: citySlug, entitySlug } = await params;
  const resolved = await resolveEntity(citySlug, entitySlug);
  if (!resolved || resolved.kind !== "school") return { title: "Not found" };
  const name = resolved.bundle.school.name_en ?? "School";
  return {
    title: `Teachers at ${name} — SchoolOye`,
    robots: { index: true, follow: true },
  };
}

/**
 * A school's published teacher roster — schools are mandated to publish
 * their teacher list, and a verified `school_teacher_affiliations` row
 * (mutual accept, see docs/screen-map.md) is the mechanism. Each card links
 * to that teacher's own canonical profile — this page never duplicates it.
 */
export default async function SchoolTeachersPage({
  params,
}: PageProps<"/[locale]/[city]/[entitySlug]/teachers">) {
  const { locale, city: citySlug, entitySlug } = await params;
  const resolved = await resolveEntity(citySlug, entitySlug);
  if (!resolved) notFound();
  if (resolved.kind === "redirect") permanentRedirect(`/${locale}${resolved.to}`);
  if (resolved.kind !== "school") notFound();

  const { bundle } = resolved;
  const { school } = bundle;
  const overviewPath = schoolPath(locale, citySlug, school);
  const team = await listPublicSchoolTeam(school.id);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href={overviewPath} className="text-meta font-semibold text-ruled-blue">
        ← {school.name_en ?? "School"}
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">
        Teachers at {school.name_en ?? "this school"}
      </h1>

      {team.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No teachers listed yet"
            description="This school hasn't added its published teacher team yet."
            nextStepLabel="Back to school page"
            nextStepHref={overviewPath}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {team.map((t) => (
            <Link
              key={t.teacherId}
              href={`/${locale}/teacher/${t.teacherId}-${t.slug}`}
              className="flex gap-3 rounded-md border border-rule bg-copy-white p-3.5 hover:border-ruled-blue"
            >
              <div className="flex h-19 w-16 shrink-0 items-center justify-center rounded-md bg-margin-paper text-meta text-muted-ink">
                Photo
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-card font-semibold">{t.fullName}</span>
                <span className="text-meta">
                  {[t.subject, t.level].filter(Boolean).join(" · ")}
                </span>
                {t.headline && (
                  <span className="mt-0.5 text-meta text-muted-ink">{t.headline}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
