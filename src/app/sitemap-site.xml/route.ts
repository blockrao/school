import { listPublicExams } from "@/lib/db/public-adapter";
import { listPublicTeachers } from "@/lib/db/teachers";
import { siteUrl } from "@/lib/env.server";
import { urlEntry, urlSetXml } from "@/lib/sitemap";

/**
 * Site-wide static + data-driven pages that aren't scoped to one city —
 * the twin of sitemap-<city>.xml (see LAUNCH_CITY_SLUGS in lib/sitemap.ts),
 * registered in sitemap.xml's index alongside the city sitemaps.
 *
 * Deliberately excludes pages that are real routes but not indexable:
 * /schools and /compare both set `robots: { index: false }` themselves (the
 * city page is the indexable entry point for search; compare has nothing to
 * show without a query string), and /alerts requires sign-in and redirects
 * anonymous visitors — none of those belong in a sitemap.
 */
export async function GET() {
  const [exams, teachers] = await Promise.all([listPublicExams(), listPublicTeachers()]);

  const teacherLastmod = (createdAt: string | null | undefined) =>
    createdAt ? new Date(createdAt) : undefined;

  const entries = [
    urlEntry(siteUrl, ""),
    urlEntry(siteUrl, "/teachers"),
    ...teachers.map((teacher) =>
      urlEntry(
        siteUrl,
        `/teacher/${teacher.id}-${teacher.slug}`,
        teacherLastmod(teacher.created_at),
      ),
    ),
    urlEntry(siteUrl, "/guides"),
    urlEntry(siteUrl, "/guides/top-schools-in-jaipur"),
    urlEntry(siteUrl, "/exams"),
    ...exams.map((exam) =>
      urlEntry(
        siteUrl,
        `/exams/${exam.slug}`,
        exam.lastCheckedAt ? new Date(exam.lastCheckedAt) : undefined,
      ),
    ),
    urlEntry(siteUrl, "/tools/age-eligibility"),
    urlEntry(siteUrl, "/admissions/help"),
    urlEntry(siteUrl, "/privacy"),
    urlEntry(siteUrl, "/terms"),
  ];

  return new Response(urlSetXml(entries), { headers: { "Content-Type": "application/xml" } });
}
