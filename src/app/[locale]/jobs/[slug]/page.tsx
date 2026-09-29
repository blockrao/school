import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ShareBar } from "@/components/ui/share-bar";
import { logAnalyticsEvent } from "@/lib/analytics";
import { getPublicJobByCode } from "@/lib/db/public-adapter";
import { JOB_STATUS_LABEL, jobStatus } from "@/lib/job-status";
import { localeCanonical } from "@/lib/seo";
import { jobPath, parseJobCode, schoolPath } from "@/lib/urls";

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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const code = parseJobCode(slug);
  if (code === null) return { title: "Not found" };
  const job = await getPublicJobByCode(code);
  if (!job) return { title: "Not found" };
  const canonical = localeCanonical(locale, jobPath("en", job.job_slug));
  const description = `${EMPLOYMENT_TYPE_LABEL[job.employment_type]} opening at ${job.school_name}${job.subject ? ` — ${job.subject}` : ""}`;
  return {
    title: `${job.title}, ${job.school_name} — SchoolOye`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: job.title,
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
  const job = await getPublicJobByCode(code);
  if (!job) notFound();
  if (job.job_slug !== slug) permanentRedirect(jobPath(locale, job.job_slug));

  await logAnalyticsEvent({
    eventType: "page_view",
    entityType: "job",
    entityId: job.id,
    schoolId: job.school_id,
  });

  const now = new Date();
  const status = jobStatus({ closesAt: job.closes_at ? new Date(job.closes_at) : null }, now);

  const jobJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: job.closes_at ?? undefined,
    employmentType: SCHEMA_EMPLOYMENT_TYPE[job.employment_type],
    hiringOrganization: { "@type": "Organization", name: job.school_name },
    jobLocation: job.location
      ? { "@type": "Place", address: job.location }
      : { "@type": "Place", address: job.school_name },
    experienceRequirements: job.experience_required ?? undefined,
    baseSalary: job.salary_range ?? undefined,
  };

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobJsonLd) }}
      />

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
    </div>
  );
}
