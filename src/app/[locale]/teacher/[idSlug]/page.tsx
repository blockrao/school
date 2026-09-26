import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getSchoolCanonicalPath } from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";
import {
  getPublicTeacherById,
  listPublicTeacherExperience,
  listPublicTeacherQualifications,
} from "@/lib/db/teachers";

// design-pending (partial): adapted from design/Teacher Profile.dc.html 14a/14b
// (claimed state). Not built: the "unclaimed" state (14c) — no staff-list
// ingestion exists to seed one, every profile that can exist here was created
// by the teacher themselves — recommendations/"Request contact"/awards/intro
// video (parked, see docs/page-enrichment-backlog.md), and photo upload (the
// storage bucket + column exist; the upload UI doesn't yet, logged alongside).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseIdSlug(idSlug: string): { id: string; slug: string } | null {
  if (idSlug.length < 38 || idSlug[36] !== "-") return null;
  const id = idSlug.slice(0, 36);
  if (!UUID_RE.test(id)) return null;
  return { id, slug: idSlug.slice(37) };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/teacher/[idSlug]">): Promise<Metadata> {
  const { idSlug } = await params;
  const parsed = parseIdSlug(idSlug);
  if (!parsed) return { title: "Not found" };
  const teacher = await getPublicTeacherById(parsed.id);
  if (!teacher) return { title: "Not found" };
  return {
    title: `${teacher.full_name}${teacher.subject ? `, ${teacher.subject} teacher` : ""} — SchoolOye`,
    description: teacher.headline ?? undefined,
    alternates: { canonical: `/teacher/${teacher.id}-${teacher.slug}` },
  };
}

export default async function TeacherProfilePage({
  params,
}: PageProps<"/[locale]/teacher/[idSlug]">) {
  const { locale, idSlug } = await params;
  const parsed = parseIdSlug(idSlug);
  if (!parsed) notFound();

  const teacher = await getPublicTeacherById(parsed.id);
  if (!teacher) notFound();
  if (teacher.slug !== parsed.slug) {
    permanentRedirect(`/${locale}/teacher/${teacher.id}-${teacher.slug}`);
  }

  const [experience, qualifications, primarySchoolPath] = await Promise.all([
    listPublicTeacherExperience(teacher.id),
    listPublicTeacherQualifications(teacher.id),
    teacher.primary_school_id
      ? getSchoolCanonicalPath(teacher.primary_school_id, locale)
      : Promise.resolve(null),
  ]);

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner =
    !!user &&
    (
      await supabase
        .from("teachers")
        .select("id")
        .eq("id", teacher.id)
        .eq("claimed_by", user.id)
        .maybeSingle()
    ).data;

  const teacherJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: teacher.full_name,
    jobTitle: teacher.subject
      ? `${teacher.level ?? ""} ${teacher.subject} Teacher`.trim()
      : undefined,
    ...(teacher.primary_school_name
      ? { worksFor: { "@type": "School", name: teacher.primary_school_name } }
      : {}),
  };

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(teacherJsonLd) }}
      />

      <div className="flex gap-4">
        <div className="flex h-28 w-24 shrink-0 items-center justify-center rounded-md bg-margin-paper text-meta text-muted-ink">
          Photo
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-title-m md:text-title-d">{teacher.full_name}</h1>
          <p className="text-body">
            {[teacher.subject, teacher.level].filter(Boolean).join(" · ")}
          </p>
          {primarySchoolPath && (
            <Link href={primarySchoolPath} className="font-semibold text-ruled-blue">
              {teacher.primary_school_name}
            </Link>
          )}
          {teacher.locality_name && (
            <p className="text-meta text-muted-ink">{teacher.locality_name}</p>
          )}
        </div>
      </div>

      {teacher.open_to.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-meta text-muted-ink">Open to</span>
          {teacher.open_to.map((o) => (
            <span key={o} className="rounded-full border border-line-blue px-3 py-1 text-meta">
              {o}
            </span>
          ))}
        </div>
      )}

      {isOwner && (
        <Link
          href={`/${locale}/teacher/${idSlug}/manage`}
          className="mt-4 inline-flex h-11 w-fit items-center rounded-md border border-ruled-blue px-4 font-semibold text-ruled-blue"
        >
          Manage your profile
        </Link>
      )}

      {teacher.about && (
        <div className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-card font-semibold">About my teaching</h2>
          <p className="mt-2 text-body leading-relaxed">{teacher.about}</p>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-card font-semibold">Experience</h2>
          <div className="mt-3 flex flex-col">
            {experience.map((e) => (
              <div
                key={e.id}
                className="flex gap-4 border-t border-rule-soft py-2.5 first:border-t-0"
              >
                <span className="w-24 shrink-0 text-meta font-semibold">
                  {e.start_year}–{e.end_year ?? "now"}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold">{e.role_title}</span>
                  <span className="text-meta text-muted-ink">{e.school_name ?? e.school_text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {qualifications.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-card font-semibold">Qualifications</h2>
          <div className="mt-3 flex flex-col">
            {qualifications.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-3 border-t border-rule-soft py-2.5 first:border-t-0"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{q.title}</span>
                  {q.detail && <span className="text-meta text-muted-ink">{q.detail}</span>}
                </div>
                <span
                  className={`shrink-0 text-meta font-semibold ${q.verified ? "text-board-green" : "text-muted-ink"}`}
                >
                  {q.verified ? "✓ Verified" : "Not checked yet"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
