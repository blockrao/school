import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ShareBar } from "@/components/ui/share-bar";
import { logAnalyticsEvent } from "@/lib/analytics";
import {
  getPublicCityAreaBySlug,
  getPublicJobByCode,
  getPublicSchoolBySlug,
  getPublicSchoolJobsBySchoolId,
} from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { formatGradeRange } from "@/lib/grades";
import { JOB_STATUS_LABEL, jobStatus } from "@/lib/job-status";
import { schoolAreaLabel } from "@/lib/school-area-label";
import { localeCanonical } from "@/lib/seo";
import {
  cityPath,
  jobPath,
  localityPath as localityHref,
  parseJobCode,
  schoolPath,
  statePath,
} from "@/lib/urls";

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  visiting: "Visiting faculty",
};

const SCHEMA_EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  visiting: "TEMPORARY",
};

// This page isn't pre-generated (no generateStaticParams — job codes are an
// unbounded, ever-growing set), so its first render per slug gets cached
// on-demand with no periodic revalidation unless set here — a page rendered
// once right after a job is posted would otherwise show that stale open/
// closed status until the next deploy. Same 15-minute window as exams/[slug].
export const revalidate = 900;

async function resolveJobContext(slug: string) {
  const code = parseJobCode(slug);
  if (code === null) return null;
  const job = await getPublicJobByCode(code);
  if (!job) return null;
  const bundle = await getPublicSchoolBySlug(job.school_slug);
  const city = bundle?.school.city_slug
    ? await getPublicCityAreaBySlug(bundle.school.city_slug)
    : null;
  return { job, bundle, city };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const ctx = await resolveJobContext(slug);
  if (!ctx) return { title: "Not found" };
  const { job, bundle, city } = ctx;

  const canonical = localeCanonical(locale, jobPath("en", job.job_slug));
  const description = `${EMPLOYMENT_TYPE_LABEL[job.employment_type]} opening at ${job.school_name}${job.subject ? ` — ${job.subject}` : ""}`;
  // Same rule as the school, events and news pages' own title/H1
  // (school-area-label.ts): locality AND city together when both are known.
  const areaLabel = schoolAreaLabel(bundle?.school.locality_name, city?.cityName);
  const titleContext = [job.school_name, areaLabel !== "India" ? areaLabel : null]
    .filter(Boolean)
    .join(", ");

  return {
    title: `${job.title}, ${titleContext} — SchoolOye`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${job.title} — ${titleContext}`,
      description,
      url: canonical,
      siteName: "SchoolOye",
    },
    twitter: { card: "summary", title: job.title, description },
  };
}

export default async function JobPage({ params }: PageProps<"/[locale]/jobs/[slug]">) {
  const { locale, slug } = await params;
  // Resolved by the permanent job_code (D-125-style, see
  // 20260929060000_school_jobs.sql): editing the title only ever changes the
  // display part of the slug, so an old URL 301s here rather than 404ing —
  // the canonical page stays there forever, only the status changes.
  const code = parseJobCode(slug);
  if (code === null) notFound();
  const ctx = await resolveJobContext(slug);
  if (!ctx) notFound();
  const { job } = ctx;
  if (job.job_slug !== slug) permanentRedirect(jobPath(locale, job.job_slug));

  const bundle = ctx.bundle;
  const city = ctx.city;
  const school = bundle?.school ?? null;

  await logAnalyticsEvent({
    eventType: "page_view",
    entityType: "job",
    entityId: job.id,
    schoolId: job.school_id,
  });

  const now = new Date();
  const status = jobStatus({ closesAt: job.closes_at ? new Date(job.closes_at) : null }, now);
  const areaLabel = schoolAreaLabel(school?.locality_name, city?.cityName);
  const canonicalPath = jobPath("en", job.job_slug);
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  // Same @id convention the entity page's own schoolJsonLd uses
  // (schoolPath(locale, ...)#school, see entity-page.tsx) — not hardcoded
  // "en" — so this node resolves against the same School node that page's
  // subjectOf array points back at, on every locale.
  const schoolNodeId = `${siteUrl}${schoolPath(locale, job.school_slug)}#school`;

  const breadcrumbTrail = city
    ? [
        // A city-state (Delhi) has no separate state crumb (D-126), same
        // convention as the school, events and news pages' own breadcrumbs.
        ...(city.isCityState
          ? []
          : [{ name: city.stateName, href: statePath(locale, city.stateSlug) }]),
        { name: city.cityName, href: cityPath(locale, city.stateSlug, city.citySlug) },
        ...(school?.locality_slug && school?.locality_name
          ? [
              {
                name: school.locality_name,
                href: localityHref(locale, city.stateSlug, city.citySlug, school.locality_slug),
              },
            ]
          : []),
        { name: job.school_name, href: schoolPath(locale, job.school_slug) },
      ]
    : [{ name: job.school_name, href: schoolPath(locale, job.school_slug) }];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ...breadcrumbTrail.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: `${siteUrl}${crumb.href}`,
      })),
      {
        "@type": "ListItem",
        position: breadcrumbTrail.length + 1,
        name: job.title,
        item: canonicalUrl,
      },
    ],
  };

  const jobJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": canonicalUrl,
    url: canonicalUrl,
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: job.closes_at ?? undefined,
    employmentType: SCHEMA_EMPLOYMENT_TYPE[job.employment_type],
    hiringOrganization: {
      "@type": "School",
      "@id": schoolNodeId,
      name: job.school_name,
      url: `${siteUrl}${schoolPath(locale, job.school_slug)}`,
    },
    // Full postal address when the school's own verified address is known
    // (same fields schoolJsonLd on the school page itself emits), not just
    // the free-text `location` label — Google's JobPosting guidelines want a
    // real address on jobLocation, not an unstructured string.
    jobLocation: {
      "@type": "Place",
      ...(school?.address
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: school.address,
              addressLocality: school.locality_name ?? city?.cityName,
              postalCode: school.pincode ?? undefined,
              addressRegion: city?.stateName,
              addressCountry: "IN",
            },
          }
        : { address: job.location ?? job.school_name }),
    },
    experienceRequirements: job.experience_required ?? undefined,
    baseSalary: job.salary_range ?? undefined,
  };

  const otherJobs = bundle
    ? (await getPublicSchoolJobsBySchoolId(job.school_id))
        .filter((j) => j.id !== job.id && !j.filled_at && !j.cancelled_at)
        .slice(0, 3)
    : [];

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobJsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
        {breadcrumbTrail.map((crumb) => (
          <span key={crumb.name}>
            <Link href={crumb.href}>{crumb.name}</Link>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
          </span>
        ))}
        <span className="text-ink">{job.title}</span>
      </nav>

      <span className="text-meta font-semibold text-muted-ink">
        {EMPLOYMENT_TYPE_LABEL[job.employment_type] ?? job.employment_type}
        {job.subject ? ` · ${job.subject}` : ""}
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-title-m md:text-title-d">{job.title}</h1>
        <span className="rounded-full border border-line-blue px-3 py-1 text-meta font-semibold">
          {JOB_STATUS_LABEL[status]}
        </span>
      </div>

      <p className="mt-2 text-body">
        at{" "}
        <Link href={schoolPath(locale, job.school_slug)} className="font-semibold text-ruled-blue">
          {job.school_name}
        </Link>
        {areaLabel !== "India" && <>, {areaLabel}</>}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-body text-muted-ink">
        {job.location && <span>{job.location}</span>}
        {job.experience_required && <span>{job.experience_required} experience</span>}
        {job.salary_range && <span>{job.salary_range}</span>}
      </div>

      <p className="mt-4 max-w-2xl whitespace-pre-wrap text-body">{job.description}</p>

      {status === "open" && (job.apply_url || job.apply_email) && (
        <a
          href={job.apply_url ?? `mailto:${job.apply_email}`}
          target={job.apply_url ? "_blank" : undefined}
          rel={job.apply_url ? "noopener noreferrer" : undefined}
          className="mt-6 flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Apply →
        </a>
      )}

      {job.closes_at && status === "open" && (
        <p className="mt-3 text-meta text-muted-ink">
          Applications close{" "}
          {new Date(job.closes_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </p>
      )}

      <ShareBar
        title={job.title}
        entityType="job"
        entityId={job.id}
        schoolId={job.school_id}
        className="mt-6"
      />

      {/* About the school — real substance instead of a bare link: the same
        facts the school's own page leads with, so this page stands on its
        own for a visitor who lands here straight from a search result. */}
      {school && (
        <div className="mt-8 flex flex-col gap-1.5 rounded-md border border-rule p-4">
          <span className="text-meta font-semibold text-muted-ink">About the school</span>
          <Link
            href={schoolPath(locale, job.school_slug)}
            className="font-display text-card font-semibold hover:text-ruled-blue"
          >
            {job.school_name}
          </Link>
          <p className="text-body text-muted-ink">
            {[
              bundle?.board?.board_name,
              formatGradeRange(school.min_class, school.max_class),
              areaLabel !== "India" ? areaLabel : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {otherJobs.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <span className="text-meta font-semibold text-muted-ink">
            More openings at {job.school_name}
          </span>
          <div className="flex flex-col gap-2">
            {otherJobs.map((other) => (
              <Link
                key={other.id}
                href={jobPath(locale, other.job_slug)}
                className="flex items-center justify-between gap-3 rounded-md border border-rule p-3 hover:border-ruled-blue"
              >
                <span className="font-semibold">{other.title}</span>
                <span className="text-meta text-muted-ink">
                  {EMPLOYMENT_TYPE_LABEL[other.employment_type] ?? other.employment_type}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href={`${schoolPath(locale, job.school_slug)}#whats-happening-heading`}
            className="w-fit font-semibold text-ruled-blue text-meta"
          >
            See everything happening at {job.school_name} →
          </Link>
        </div>
      )}
    </div>
  );
}
