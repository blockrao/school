import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/state-message";
import { getMySchoolId, listJobsForSchool } from "@/lib/db/portal";
import { JOB_STATUS_LABEL, jobStatus } from "@/lib/job-status";
import { cancelJobAction, markJobFilledAction, requestJobListingAction } from "./[id]/actions";

export const metadata: Metadata = {
  title: "Jobs — SchoolOye portal",
  robots: { index: false, follow: false },
};

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  visiting: "Visiting faculty",
};

const STATUS_CLASS: Record<string, string> = {
  cancelled: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
  filled: "border-sponsored-border text-muted-ink",
  closed: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
  open: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
};

const LISTING_LABEL: Record<string, string> = {
  pending: "Listing requested — awaiting review",
  approved: "Listed on /jobs",
  edited: "Listed on /jobs",
  rejected: "Listing not approved",
  needs_triage: "Listing requested — awaiting review",
};

export default async function SchoolJobsPage() {
  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const jobs = await listJobsForSchool(schoolId);
  const now = new Date();

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/portal" className="text-meta font-semibold text-ruled-blue">
            ← Dashboard
          </Link>
          <h1 className="mt-1 font-display text-title-m md:text-title-d">Jobs</h1>
          <p className="mt-1 text-body text-muted-ink">
            Open teaching and staff positions at your school.
          </p>
        </div>
        <Link
          href="/portal/jobs/new"
          className="flex h-11 items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
        >
          Post a job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No jobs yet"
            description="Post an opening for teaching or non-teaching staff."
            nextStepLabel="Post a job"
            nextStepHref="/portal/jobs/new"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {jobs.map((job) => {
            const status = jobStatus(
              {
                closesAt: job.closes_at ? new Date(job.closes_at) : null,
                filledAt: job.filled_at ? new Date(job.filled_at) : null,
                cancelledAt: job.cancelled_at ? new Date(job.cancelled_at) : null,
              },
              now,
            );
            return (
              <div key={job.id} className="rounded-md border border-rule bg-copy-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-meta font-semibold text-muted-ink">
                      {EMPLOYMENT_TYPE_LABEL[job.employment_type] ?? job.employment_type}
                    </span>
                    <h2 className="font-display text-card font-semibold">{job.title}</h2>
                    <p className="mt-1 text-meta text-muted-ink">
                      Posted{" "}
                      {new Date(job.created_at).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-meta font-semibold ${
                      STATUS_CLASS[status] ?? ""
                    }`}
                  >
                    {JOB_STATUS_LABEL[status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
                  {job.listing_review ? (
                    <span className="text-meta text-muted-ink">
                      {LISTING_LABEL[job.listing_review] ?? job.listing_review}
                    </span>
                  ) : (
                    <form action={requestJobListingAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button
                        type="submit"
                        className="text-meta font-semibold text-ruled-blue underline"
                      >
                        Request listing on /jobs →
                      </button>
                    </form>
                  )}
                  {status === "open" && (
                    <>
                      <form action={markJobFilledAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <button type="submit" className="text-meta text-muted-ink underline">
                          Mark filled
                        </button>
                      </form>
                      <form action={cancelJobAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <button type="submit" className="text-meta text-muted-ink underline">
                          Cancel posting
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
