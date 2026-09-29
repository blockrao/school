import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getJobForSchool, getMySchoolId } from "@/lib/db/portal";
import { updateJobAction } from "./actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Edit job — SchoolOye portal",
  robots: { index: false, follow: false },
};

const EMPLOYMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "visiting", label: "Visiting faculty" },
];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditSchoolJobPage({
  params,
  searchParams,
}: PageProps<"/portal/jobs/[id]">) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const errorCode = first(rawSearchParams.error);

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const job = await getJobForSchool(id, schoolId);
  if (!job) notFound();

  const locked = job.listing_review === "pending";

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal/jobs" className="text-meta font-semibold text-ruled-blue">
        ← Jobs
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Edit job</h1>

      {job.rejection_reason && (
        <div className="mt-3 rounded-md border border-pill-closed-bd bg-pill-closed-bg p-3 text-body">
          <span className="font-semibold">Not approved for /jobs: </span>
          {job.rejection_reason}
        </div>
      )}

      {locked && (
        <p className="mt-3 rounded-md border border-sponsored-border p-3 text-body text-muted-ink">
          This job is currently under review for /jobs — editing is locked until that review
          finishes so the version ops sees doesn't shift underneath them.
        </p>
      )}

      <form action={updateJobAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="jobId" value={job.id} />

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Employment type</span>
          <select
            name="employmentType"
            defaultValue={job.employment_type}
            disabled={locked}
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {/* employmentType isn't wired into updateJobAction/updateJob yet — this table's
          employment_type has no edit path in this increment's scope, shown read-only
          via `disabled` intentionally rather than silently dropped from the form. */}

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Title</span>
          <input
            type="text"
            name="title"
            required
            maxLength={200}
            defaultValue={job.title}
            disabled={locked}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Subject (optional)</span>
          <input
            type="text"
            name="subject"
            maxLength={100}
            defaultValue={job.subject ?? ""}
            disabled={locked}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Description</span>
          <textarea
            name="description"
            required
            rows={4}
            maxLength={5000}
            defaultValue={job.description}
            disabled={locked}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">
              Experience required (optional)
            </span>
            <input
              type="text"
              name="experienceRequired"
              maxLength={200}
              defaultValue={job.experience_required ?? ""}
              disabled={locked}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Salary range (optional)</span>
            <input
              type="text"
              name="salaryRange"
              maxLength={100}
              defaultValue={job.salary_range ?? ""}
              disabled={locked}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Location (optional)</span>
          <input
            type="text"
            name="location"
            maxLength={200}
            defaultValue={job.location ?? ""}
            disabled={locked}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Apply link</span>
            <input
              type="url"
              name="applyUrl"
              defaultValue={job.apply_url ?? ""}
              disabled={locked}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Apply email</span>
            <input
              type="email"
              name="applyEmail"
              defaultValue={job.apply_email ?? ""}
              disabled={locked}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
            />
          </label>
        </div>
        <p className="text-meta text-muted-ink">Provide at least one of the two above.</p>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Applications close (optional)
          </span>
          <input
            type="datetime-local"
            name="closesAt"
            defaultValue={job.closes_at ? toDatetimeLocal(job.closes_at) : ""}
            disabled={locked}
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        {errorCode && (
          <FieldError id="job-edit-error">
            {errorCode === "locked"
              ? "This job is locked while its /jobs listing is under review."
              : errorCode === "no_apply_contact"
                ? "Provide an apply link or an apply email."
                : "Check the required fields — title, description and apply contact are needed."}
          </FieldError>
        )}

        <button
          type="submit"
          disabled={locked}
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white disabled:opacity-50"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
