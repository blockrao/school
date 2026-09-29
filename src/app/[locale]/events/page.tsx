import type { Metadata } from "next";
import Link from "next/link";
import { listPublicEvents } from "@/lib/db/public-adapter";
import { EVENT_STATUS_LABEL, eventTemporalStatus } from "@/lib/event-status";
import { localeCanonical } from "@/lib/seo";
import { eventPath, eventsRootPath } from "@/lib/urls";

// Same reasoning as news/page.tsx: a live discovery feed with no dynamic
// function and no revalidate would otherwise cache indefinitely, so a
// newly-created event wouldn't show here until the next deploy.
export const revalidate = 900;

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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/events">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "School events — SchoolOye",
    description: "PTMs, open houses, sports day, admission tests and more from schools near you.",
    alternates: { canonical: localeCanonical(locale, eventsRootPath("en")) },
  };
}

export default async function EventsIndexPage({ params }: PageProps<"/[locale]/events">) {
  const { locale } = await params;
  const events = await listPublicEvents();
  const now = new Date();

  // Upcoming/ongoing first, most recently completed last — this is a
  // discovery feed, not an archive, so a past event sorts to the bottom
  // rather than by raw date order.
  const withStatus = events.map((event) => ({
    event,
    status: eventTemporalStatus(
      {
        startsAt: new Date(event.starts_at),
        endsAt: event.ends_at ? new Date(event.ends_at) : null,
      },
      now,
    ),
  }));
  const rank: Record<string, number> = { ongoing: 0, upcoming: 1, completed: 2, cancelled: 3 };
  withStatus.sort((a, b) => rank[a.status] - rank[b.status]);

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School events</h1>
      <p className="mt-1 text-body text-muted-ink">
        PTMs, open houses, sports day, admission tests and more, straight from schools.
      </p>

      {withStatus.length === 0 ? (
        <p className="mt-6 text-body text-muted-ink">No events listed yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {withStatus.map(({ event, status }) => (
            <Link
              key={event.id}
              href={eventPath(locale, event.event_slug)}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
            >
              <div>
                <span className="text-meta font-semibold text-muted-ink">
                  {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
                </span>
                <h2 className="font-display text-card font-semibold">{event.title}</h2>
                <p className="mt-1 text-meta text-muted-ink">
                  {event.school_name} ·{" "}
                  {new Date(event.starts_at).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-line-blue px-3 py-1 text-meta font-semibold">
                {EVENT_STATUS_LABEL[status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
