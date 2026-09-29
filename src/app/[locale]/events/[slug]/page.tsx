import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ShareBar } from "@/components/ui/share-bar";
import { logAnalyticsEvent } from "@/lib/analytics";
import { getPublicEventByCode } from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { EVENT_STATUS_LABEL, eventTemporalStatus } from "@/lib/event-status";
import { localeCanonical } from "@/lib/seo";
import { eventPath, parseEventCode, schoolPath } from "@/lib/urls";

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
}: PageProps<"/[locale]/events/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const code = parseEventCode(slug);
  if (code === null) return { title: "Not found" };
  const event = await getPublicEventByCode(code);
  if (!event) return { title: "Not found" };
  const canonical = localeCanonical(locale, eventPath("en", event.event_slug));
  const description =
    event.description ?? `${EVENT_TYPE_LABEL[event.event_type]} at ${event.school_name}`;
  return {
    title: `${event.title}, ${event.school_name} — SchoolOye`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      url: canonical,
      siteName: "SchoolOye",
    },
    twitter: { card: "summary", title: event.title, description },
  };
}

export default async function EventPage({ params }: PageProps<"/[locale]/events/[slug]">) {
  const { locale, slug } = await params;
  // Resolved by the permanent event_code (D-125-style, see
  // 20260929050000_events_and_news_depth.sql): editing the title only ever
  // changes the display part of the slug, so an old URL 301s here rather
  // than 404ing — "stays there forever" per Prav's requirement.
  const code = parseEventCode(slug);
  if (code === null) notFound();
  const event = await getPublicEventByCode(code);
  if (!event) notFound();
  if (event.event_slug !== slug) permanentRedirect(eventPath(locale, event.event_slug));

  await logAnalyticsEvent({
    eventType: "page_view",
    entityType: "event",
    entityId: event.id,
    schoolId: event.school_id,
  });

  const now = new Date();
  const status = eventTemporalStatus(
    { startsAt: new Date(event.starts_at), endsAt: event.ends_at ? new Date(event.ends_at) : null },
    now,
  );

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    location: event.location
      ? { "@type": "Place", name: event.location }
      : { "@type": "Place", name: event.school_name },
    // Structured-data section audit (29 Sep 2026) — @id, not just a name
    // string; see news/[slug]/page.tsx's identical comment.
    organizer: {
      "@type": "School",
      "@id": `${siteUrl}${schoolPath(locale, event.school_slug)}#school`,
      name: event.school_name,
    },
    eventStatus:
      status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
  };

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />

      <span className="text-meta font-semibold text-muted-ink">
        {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-title-m md:text-title-d">{event.title}</h1>
        <span className="rounded-full border border-line-blue px-3 py-1 text-meta font-semibold">
          {EVENT_STATUS_LABEL[status]}
        </span>
      </div>

      <p className="mt-2 text-body">
        at{" "}
        <Link
          href={schoolPath(locale, event.school_slug)}
          className="font-semibold text-ruled-blue"
        >
          {event.school_name}
        </Link>
      </p>

      <p className="mt-4 text-body">
        {new Date(event.starts_at).toLocaleString("en-IN", {
          dateStyle: "full",
          timeStyle: "short",
        })}
        {event.ends_at
          ? ` – ${new Date(event.ends_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}`
          : ""}
      </p>
      {event.location && <p className="mt-1 text-body text-muted-ink">{event.location}</p>}

      {event.description && (
        <p className="mt-4 max-w-2xl whitespace-pre-wrap text-body">{event.description}</p>
      )}

      {event.registration_url && status !== "completed" && status !== "cancelled" && (
        <a
          href={event.registration_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Register →
        </a>
      )}

      {event.source_url && (
        <a
          href={event.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block text-meta text-ruled-blue"
        >
          Source: {event.source_url}
        </a>
      )}

      <ShareBar
        title={event.title}
        entityType="event"
        entityId={event.id}
        schoolId={event.school_id}
        className="mt-6"
      />
    </div>
  );
}
