import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/state-message";
import { getMySchoolId, listEventsForSchool } from "@/lib/db/portal";
import { EVENT_STATUS_LABEL, eventTemporalStatus } from "@/lib/event-status";
import { cancelEventAction, requestEventListingAction } from "./[id]/actions";

export const metadata: Metadata = {
  title: "Events — SchoolOye portal",
  robots: { index: false, follow: false },
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  ptm: "Parent-teacher meeting",
  open_house: "Open house",
  admission_test: "Admission test",
  sports_day: "Sports day",
  cultural: "Cultural event",
  workshop: "Workshop",
  result_day: "Result day",
  holiday: "Holiday",
  fee_deadline: "Fee deadline",
  other: "Event",
};

const STATUS_CLASS: Record<string, string> = {
  cancelled: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
  upcoming: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  ongoing: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  completed: "border-sponsored-border text-muted-ink",
};

const LISTING_LABEL: Record<string, string> = {
  pending: "Listing requested — awaiting review",
  approved: "Listed on /events",
  edited: "Listed on /events",
  rejected: "Listing not approved",
  needs_triage: "Listing requested — awaiting review",
};

export default async function SchoolEventsPage() {
  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const events = await listEventsForSchool(schoolId);
  const now = new Date();

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/portal" className="text-meta font-semibold text-ruled-blue">
            ← Dashboard
          </Link>
          <h1 className="mt-1 font-display text-title-m md:text-title-d">Events</h1>
          <p className="mt-1 text-body text-muted-ink">
            PTMs, open houses, sports day, admission tests — keep parents in the loop.
          </p>
        </div>
        <Link
          href="/portal/events/new"
          className="flex h-11 items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
        >
          Add an event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No events yet"
            description="Add your next PTM, open house, or sports day."
            nextStepLabel="Add an event"
            nextStepHref="/portal/events/new"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {events.map((event) => {
            const status = eventTemporalStatus(
              {
                startsAt: new Date(event.starts_at),
                endsAt: event.ends_at ? new Date(event.ends_at) : null,
                cancelledAt: event.cancelled_at ? new Date(event.cancelled_at) : null,
              },
              now,
            );
            return (
              <div key={event.id} className="rounded-md border border-rule bg-copy-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-meta font-semibold text-muted-ink">
                      {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
                    </span>
                    <h2 className="font-display text-card font-semibold">{event.title}</h2>
                    <p className="mt-1 text-meta text-muted-ink">
                      {new Date(event.starts_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-meta font-semibold ${
                      STATUS_CLASS[status] ?? ""
                    }`}
                  >
                    {EVENT_STATUS_LABEL[status]}
                  </span>
                </div>

                {event.rejection_reason && (
                  <p className="mt-2 rounded-md border border-pill-closed-bd bg-pill-closed-bg p-2 text-meta">
                    <span className="font-semibold">Not approved for /events: </span>
                    {event.rejection_reason}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
                  {event.listing_review && event.listing_review !== "rejected" ? (
                    <span className="text-meta text-muted-ink">
                      {LISTING_LABEL[event.listing_review] ?? event.listing_review}
                    </span>
                  ) : (
                    <form action={requestEventListingAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button
                        type="submit"
                        className="text-meta font-semibold text-ruled-blue underline"
                      >
                        {event.listing_review === "rejected"
                          ? "Resubmit for review →"
                          : "Request listing on /events →"}
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/portal/events/${event.id}`}
                    className="text-meta font-semibold text-ruled-blue underline"
                  >
                    Edit
                  </Link>
                  {status !== "cancelled" && status !== "completed" && (
                    <form action={cancelEventAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="text-meta text-muted-ink underline">
                        Cancel event
                      </button>
                    </form>
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
