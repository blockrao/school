import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getMySchoolId } from "@/lib/db/portal";
import { submitSchoolEvent } from "./actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Add an event — SchoolOye portal",
  robots: { index: false, follow: false },
};

const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ptm", label: "Parent-teacher meeting" },
  { value: "open_house", label: "Open house" },
  { value: "admission_test", label: "Admission test" },
  { value: "sports_day", label: "Sports day" },
  { value: "cultural", label: "Cultural event" },
  { value: "workshop", label: "Workshop" },
  { value: "result_day", label: "Result day" },
  { value: "holiday", label: "Holiday" },
  { value: "fee_deadline", label: "Fee deadline" },
  { value: "other", label: "Other" },
];

export default async function NewSchoolEventPage({
  searchParams,
}: PageProps<"/portal/events/new">) {
  const rawSearchParams = await searchParams;

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const errorCode = first(rawSearchParams.error);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal/events" className="text-meta font-semibold text-ruled-blue">
        ← Events
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Add an event</h1>
      <p className="mt-1 text-body text-muted-ink">
        Shows on your school page right away. You can separately request a spot on SchoolOye's main
        /events page once it's added.
      </p>

      <form action={submitSchoolEvent} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Event type</span>
          <select
            name="eventType"
            defaultValue="ptm"
            className="h-12 w-fit rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
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
            placeholder="Annual sports day 2026"
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Description (optional)</span>
          <textarea
            name="description"
            rows={4}
            maxLength={5000}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Starts</span>
            <input
              type="datetime-local"
              name="startsAt"
              required
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Ends (optional)</span>
            <input
              type="datetime-local"
              name="endsAt"
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

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Registration link (optional)
          </span>
          <input
            type="url"
            name="registrationUrl"
            placeholder="https://yourschool.edu.in/events/..."
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Source link (optional)</span>
          <input
            type="url"
            name="sourceUrl"
            placeholder="https://yourschool.edu.in/notices/..."
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

        {errorCode && (
          <FieldError id="event-error">
            {errorCode === "invalid_dates"
              ? "The end time can't be before the start time."
              : errorCode === "invalid"
                ? "Check the required fields — title and start time are needed."
                : "Something went wrong. Please try again."}
          </FieldError>
        )}

        <button
          type="submit"
          className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Add event
        </button>
      </form>
    </div>
  );
}
