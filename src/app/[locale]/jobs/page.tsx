import type { Metadata } from "next";
import Link from "next/link";
import { listPublicJobs } from "@/lib/db/public-adapter";
import { localeCanonical } from "@/lib/seo";
import { jobPath, jobsRootPath } from "@/lib/urls";

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  visiting: "Visiting faculty",
};

export async function generateMetadata({ params }: PageProps<"/[locale]/jobs">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "School jobs — SchoolOye",
    description: "Teaching and staff openings posted directly by schools near you.",
    alternates: { canonical: localeCanonical(locale, jobsRootPath("en")) },
  };
}

export default async function JobsIndexPage({ params }: PageProps<"/[locale]/jobs">) {
  const { locale } = await params;
  // The aggregator (api.public_jobs) already excludes filled/cancelled jobs,
  // so every row here is open — newest posting first is the right default
  // for a discovery feed like this (no derived-status sort needed, unlike
  // /events which mixes upcoming/ongoing/completed in one feed).
  const jobs = await listPublicJobs();

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School jobs</h1>
      <p className="mt-1 text-body text-muted-ink">
        Teaching and staff openings, posted directly by schools.
      </p>

      {jobs.length === 0 ? (
        <p className="mt-6 text-body text-muted-ink">No jobs listed yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={jobPath(locale, job.job_slug)}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
            >
              <div>
                <span className="text-meta font-semibold text-muted-ink">
                  {EMPLOYMENT_TYPE_LABEL[job.employment_type] ?? job.employment_type}
                  {job.subject ? ` · ${job.subject}` : ""}
                </span>
                <h2 className="font-display text-card font-semibold">{job.title}</h2>
                <p className="mt-1 text-meta text-muted-ink">
                  {job.school_name}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
