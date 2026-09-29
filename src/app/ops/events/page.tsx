import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { approveEventListing, rejectEventListing } from "./actions";

export const metadata: Metadata = {
  title: "School events — SchoolOye ops",
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

export default async function OpsEventsPage() {
  const { supabase } = await requireStaff();

  // P1.5: includes 'edited' — a materially-edited, previously-approved event
  // is demoted here (school_events_enforce_edit_lock) and needs the same
  // re-review as a fresh 'pending' request, not just 'pending' itself.
  const { data: events } = await supabase
    .from("school_events")
    .select("id, school_id, event_type, title, description, starts_at, location, created_at")
    .in("listing_review", ["pending", "edited"])
    .order("created_at", { ascending: true });

  const schoolIds = [...new Set((events ?? []).map((e) => e.school_id))];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School events</h1>
      <p className="mt-1 text-body text-muted-ink">
        Already live on each school's own page; approving adds the event to the public /events feed.
      </p>

      {!events || events.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing pending"
            description="No schools are currently waiting on an /events listing decision."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-md border border-rule bg-copy-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-meta font-semibold text-muted-ink">
                    {schoolNameById.get(event.school_id) ?? event.school_id} ·{" "}
                    {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
                  </span>
                  <h2 className="font-display text-card font-semibold">{event.title}</h2>
                  {event.description ? (
                    <p className="mt-1 max-w-2xl whitespace-pre-wrap text-body">
                      {event.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-meta text-muted-ink">
                    {new Date(event.starts_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <form action={approveEventListing}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <button
                      type="submit"
                      className="flex h-10 w-full items-center justify-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                    >
                      Approve listing
                    </button>
                  </form>
                  <form action={rejectEventListing} className="flex flex-col gap-1.5">
                    <textarea
                      name="reason"
                      required
                      rows={2}
                      placeholder="Reason for rejection (shown to the school)"
                      className="w-56 rounded-md border border-line-blue-strong bg-copy-white p-2 text-meta outline-none"
                    />
                    <input type="hidden" name="eventId" value={event.id} />
                    <button
                      type="submit"
                      className="flex h-10 items-center justify-center rounded-md border border-ink px-3 text-meta font-semibold"
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
