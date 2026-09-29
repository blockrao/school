import {
  listPublicAreas,
  listPublicEvents,
  listPublicExams,
  listPublicJobs,
  listPublicNews,
} from "@/lib/db/public-adapter";
import { listPublicTeachers } from "@/lib/db/teachers";
import { siteUrl } from "@/lib/env.server";
import { urlEntry, urlSetXml } from "@/lib/sitemap";
import {
  eventPath,
  eventsRootPath,
  jobPath,
  jobsRootPath,
  newsPath,
  newsRootPath,
  statePath,
  teacherPath,
} from "@/lib/urls";

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
  const [exams, teachers, areas, events, news, jobs] = await Promise.all([
    listPublicExams(),
    listPublicTeachers(),
    listPublicAreas(),
    // SEO/GEO follow-up (29 Sep 2026): api.public_events / api.public_news /
    // api.public_jobs already filter to listing_review = 'approved' — every
    // row here is a real, ops-cleared canonical page. Volume is nowhere near
    // schools' 8,000+, so these share this site-wide file rather than
    // getting their own sitemap-<slug>.xml the way a city does.
    listPublicEvents(),
    listPublicNews(),
    listPublicJobs(),
  ]);

  const teacherLastmod = (createdAt: string | null | undefined) =>
    createdAt ? new Date(createdAt) : undefined;

  // State canonical pages (docs/seo-canonical-pages-spec.md) — a state is
  // "launched" the moment any one of its cities is, so this is derived from
  // the same is_launch data as the city sitemaps rather than a hardcoded
  // list. Not its own per-state sitemap file (no routing constraint forces
  // that split the way it does for cities — see lib/sitemap.ts) — just more
  // entries in this one.
  const launchedStateSlugs = [
    ...new Set(areas.filter((a) => a.is_launch).map((a) => a.state_slug)),
  ];

  const entries = [
    urlEntry(siteUrl, ""),
    ...launchedStateSlugs.map((slug) => urlEntry(siteUrl, statePath("en", slug))),
    urlEntry(siteUrl, "/teachers"),
    ...teachers.map((teacher) =>
      urlEntry(siteUrl, teacherPath("en", teacher.slug), teacherLastmod(teacher.created_at)),
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
    urlEntry(siteUrl, eventsRootPath("en")),
    ...events.map((event) =>
      urlEntry(
        siteUrl,
        eventPath("en", event.event_slug),
        event.listing_reviewed_at ? new Date(event.listing_reviewed_at) : undefined,
      ),
    ),
    urlEntry(siteUrl, newsRootPath("en")),
    ...news.map((post) =>
      urlEntry(siteUrl, newsPath("en", post.post_slug), new Date(post.published_at)),
    ),
    urlEntry(siteUrl, jobsRootPath("en")),
    ...jobs.map((job) =>
      urlEntry(
        siteUrl,
        jobPath("en", job.job_slug),
        job.listing_reviewed_at ? new Date(job.listing_reviewed_at) : undefined,
      ),
    ),
    urlEntry(siteUrl, "/privacy"),
    urlEntry(siteUrl, "/terms"),
  ];

  return new Response(urlSetXml(entries), { headers: { "Content-Type": "application/xml" } });
}
