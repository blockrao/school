import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getEventForSchool, getMySchoolId } from "@/lib/db/portal";
import { updateEventAction } from "./actions";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Edit event — SchoolOye portal",
  robots: { index: false, follow: false },
};

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time, with no timezone —
// stored values are ISO timestamps, so this strips the parts a
// datetime-local input can't use.
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditSchoolEventPage({
  params,
  searchParams,
}: PageProps<"/portal/events/[id]">) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const errorCode = first(rawSearchParams.error);

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const event = await getEventForSchool(id, schoolId);
  if (!event) notFound();

  const locked = event.listing_review === "pending";

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link href="/portal/events" className="text-meta font-semibold text-ruled-blue">
        ← Events
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">Edit event</h1>

      {event.rejection_reason && (
        <div className="mt-3 rounded-md border border-pill-closed-bd bg-pill-closed-bg p-3 text-body">
          <span className="font-semibold">Not approved for /events: </span>
          {event.rejection_reason}
        </div>
      )}

      {locked && (
        <p className="mt-3 rounded-md border border-sponsored-border p-3 text-body text-muted-ink">
          This event is currently under review for /events — editing is locked until that review
          finishes so the version ops sees doesn't shift underneath them.
        </p>
      )}

      <form action={updateEventAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="eventId" value={event.id} />

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Title</span>
          <input
            type="text"
            name="title"
            required
            maxLength={200}
            defaultValue={event.title}
            disabled={locked}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Description (optional)</span>
          <textarea
            name="description"
            rows={4}
            maxLength={5000}
            defaultValue={event.description ?? ""}
            disabled={locked}
            className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Starts</span>
            <input
              type="datetime-local"
              name="startsAt"
              required
              defaultValue={toDatetimeLocal(event.starts_at)}
              disabled={locked}
              className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-muted-ink">Ends (optional)</span>
            <input
              type="datetime-local"
              name="endsAt"
              defaultValue={event.ends_at ? toDatetimeLocal(event.ends_at) : ""}
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
            defaultValue={event.location ?? ""}
            disabled={locked}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">
            Registration link (optional)
          </span>
          <input
            type="url"
            name="registrationUrl"
            defaultValue={event.registration_url ?? ""}
            disabled={locked}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink">Source link (optional)</span>
          <input
            type="url"
            name="sourceUrl"
            defaultValue={event.source_url ?? ""}
            disabled={locked}
            className="h-12 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none disabled:opacity-50"
          />
        </label>

        {errorCode && (
          <FieldError id="event-edit-error">
            {errorCode === "locked"
              ? "This event is locked while its /events listing is under review."
              : "Check the required fields — title and start time are needed."}
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
