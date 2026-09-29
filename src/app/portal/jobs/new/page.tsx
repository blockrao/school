import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getMySchoolId } from "@/lib/db/portal";
import { submitSchoolJob } from "./actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Post a job — SchoolOye portal",
  robots: { index: false, follow: false },
};

const EMPLOYMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "visiting", label: "Visiting faculty" },
];

export default async function NewSchoolJobPage({ searchParams }: PageProps<"/portal/jobs/new">) {
  const rawSearchParams = await searchParams;

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal/jobs" className="text-meta font-semibold text-ruled-blue">
        ← Jobs
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Post a job</h1>
      <p className="mt-1 text-body text-muted-ink">
        Shows on your school page right away. You can separately request a spot on SchoolOye's main
        /jobs page once it's added.
      </p>

      <form action={submitSchoolJob} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Employment type</span>
          <select
            name="employmentType"
            defaultValue="full_time"
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Title</span>
          <input
            type="text"
            name="title"
            required
            maxLength={200}
            placeholder="PGT Mathematics"
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Subject (optional)</span>
          <input
            type="text"
            name="subject"
            maxLength={100}
            placeholder="Mathematics"
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Description</span>
          <textarea
            name="description"
            required
            rows={4}
            maxLength={5000}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
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
              placeholder="3+ years"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Salary range (optional)</span>
            <input
              type="text"
              name="salaryRange"
              maxLength={100}
              placeholder="₹30,000–₹45,000/month"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Location (optional)</span>
          <input
            type="text"
            name="location"
            maxLength={200}
            placeholder="Defaults to your school's address if left blank"
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Apply link</span>
            <input
              type="url"
              name="applyUrl"
              placeholder="https://yourschool.edu.in/careers/..."
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Apply email</span>
            <input
              type="email"
              name="applyEmail"
              placeholder="careers@yourschool.edu.in"
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
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
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        {errorCode && (
          <FieldError id="job-error">
            {errorCode === "no_apply_contact"
              ? "Provide an apply link or an apply email."
              : errorCode === "invalid"
                ? "Check the required fields — title, description and apply contact are needed."
                : "Something went wrong. Please try again."}
          </FieldError>
        )}

        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Post job
        </button>
      </form>
    </div>
  );
}
