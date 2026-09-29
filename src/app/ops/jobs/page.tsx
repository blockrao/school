import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { approveJobListing, rejectJobListing } from "./actions";

export const metadata: Metadata = {
  title: "School jobs — SchoolOye ops",
  robots: { index: false, follow: false },
};

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  visiting: "Visiting faculty",
};

export default async function OpsJobsPage() {
  const { supabase } = await requireStaff();

  const { data: jobs } = await supabase
    .from("school_jobs")
    .select("id, school_id, title, employment_type, subject, description, location, created_at")
    .eq("listing_review", "pending")
    .order("created_at", { ascending: true });

  const schoolIds = [...new Set((jobs ?? []).map((j) => j.school_id))];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School jobs</h1>
      <p className="mt-1 text-body text-muted-ink">
        Already live on each school's own page; approving adds the posting to the public /jobs feed.
      </p>

      {!jobs || jobs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing pending"
            description="No schools are currently waiting on a /jobs listing decision."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-md border border-rule bg-copy-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-meta font-semibold text-muted-ink">
                    {schoolNameById.get(job.school_id) ?? job.school_id} ·{" "}
                    {EMPLOYMENT_TYPE_LABEL[job.employment_type] ?? job.employment_type}
                    {job.subject ? ` · ${job.subject}` : ""}
                  </span>
                  <h2 className="font-display text-card font-semibold">{job.title}</h2>
                  <p className="mt-1 max-w-2xl whitespace-pre-wrap text-body">{job.description}</p>
                  <p className="mt-1 text-meta text-muted-ink">
                    Posted{" "}
                    {new Date(job.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    {job.location ? ` · ${job.location}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveJobListing}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <button
                      type="submit"
                      className="flex h-10 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                    >
                      Approve listing
                    </button>
                  </form>
                  <form action={rejectJobListing}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <button
                      type="submit"
                      className="flex h-10 items-center rounded-md border border-ink px-3 text-meta font-semibold"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
