import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { ShareBar } from "@/components/ui/share-bar";
import { logAnalyticsEvent } from "@/lib/analytics";
import {
  getPublicCityAreaBySlug,
  getPublicEventByCode,
  getPublicSchoolBySlug,
  getPublicSchoolEventsBySchoolId,
} from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { EVENT_STATUS_LABEL, eventTemporalStatus } from "@/lib/event-status";
import { formatGradeRange } from "@/lib/grades";
import { schoolAreaLabel } from "@/lib/school-area-label";
import { localeCanonical } from "@/lib/seo";
import {
  cityPath,
  eventPath,
  localityPath as localityHref,
  parseEventCode,
  schoolPath,
  statePath,
} from "@/lib/urls";

// This page isn't pre-generated (no generateStaticParams — event codes are
// an unbounded, ever-growing set), so its first render per slug gets cached
// on-demand with no periodic revalidation unless set here, same trap as
// news/[slug] and the /news and /events index feeds. A page rendered once
// right after an event is created would otherwise show that stale snapshot
// (status pill, time, registration link) until the next deploy. Same
// 15-minute window as exams/[slug] for the same "live status, don't bake it
// into a long-lived cache" reason.
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

// The P0 that made this page worth redoing: toLocaleString("en-IN", ...)
// without an explicit `timeZone` formats in the SERVER's local time (UTC on
// Vercel), not India Standard Time — "en-IN" only controls number/date
// FORMATTING conventions, it is not a timezone. A 6:00 PM IST event was
// rendering as "12:30 pm" (its raw UTC hour). Every date/time shown on this
// page must set timeZone: "Asia/Kolkata" explicitly — every school on this
// site is in India, so this is never wrong to hard-code, unlike guessing a
// visitor's own timezone.
const IST_DATE_TIME: Intl.DateTimeFormatOptions = {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
};
const IST_TIME_ONLY: Intl.DateTimeFormatOptions = { timeStyle: "short", timeZone: "Asia/Kolkata" };

function formatIst(iso: string, opts: Intl.DateTimeFormatOptions = IST_DATE_TIME): string {
  return new Date(iso).toLocaleString("en-IN", opts);
}

/** Google Calendar "quick add" link — no API key, no new dependency, works for
 * every visitor regardless of which calendar app they use (they can still
 * import from Google Calendar into Outlook/Apple Calendar afterwards). Dates
 * must be UTC in Google's own `YYYYMMDDTHHmmssZ` format — using the ISO
 * timestamps directly (already correct UTC) rather than the IST-formatted
 * display strings above, which are for humans, not this URL. */
function googleCalendarUrl(input: {
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  details: string;
}): string {
  const toGCalStamp = (iso: string) =>
    iso
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")
      .slice(0, 15) + "Z";
  const start = toGCalStamp(input.startsAt);
  const end = input.endsAt ? toGCalStamp(input.endsAt) : start;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${start}/${end}`,
    details: input.details,
  });
  if (input.location) params.set("location", input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function resolveEventContext(slug: string) {
  const code = parseEventCode(slug);
  if (code === null) return null;
  const event = await getPublicEventByCode(code);
  if (!event) return null;
  const bundle = await getPublicSchoolBySlug(event.school_slug);
  const city = bundle?.school.city_slug
    ? await getPublicCityAreaBySlug(bundle.school.city_slug)
    : null;
  return { event, bundle, city };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/events/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const ctx = await resolveEventContext(slug);
  if (!ctx) return { title: "Not found" };
  const { event, bundle, city } = ctx;

  const canonical = localeCanonical(locale, eventPath("en", event.event_slug));
  const description =
    event.description ?? `${EVENT_TYPE_LABEL[event.event_type]} at ${event.school_name}`;
  // Same rule as the school page's own title/H1 (school-area-label.ts):
  // locality AND city together when both are known, city-state schools have
  // no separate school-level locality data here so this usually resolves to
  // just the city — still real, sourced context, never invented.
  const areaLabel = schoolAreaLabel(bundle?.school.locality_name, city?.cityName);
  const titleContext = [event.school_name, areaLabel !== "India" ? areaLabel : null]
    .filter(Boolean)
    .join(", ");

  return {
    title: `${event.title}, ${titleContext} — SchoolOye`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${event.title} — ${titleContext}`,
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
  const ctx = await resolveEventContext(slug);
  if (!ctx) notFound();
  const { event } = ctx;
  if (event.event_slug !== slug) permanentRedirect(eventPath(locale, event.event_slug));

  const bundle = ctx.bundle;
  const city = ctx.city;
  const school = bundle?.school ?? null;

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

  const areaLabel = schoolAreaLabel(school?.locality_name, city?.cityName);
  const canonicalPath = eventPath("en", event.event_slug);
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  // Same @id convention the entity page's own schoolJsonLd uses
  // (schoolPath(locale, ...)#school, see entity-page.tsx) — not hardcoded
  // "en" — so this node resolves against the same School node that page's
  // subjectOf array points back at, on every locale.
  const schoolNodeId = `${siteUrl}${schoolPath(locale, event.school_slug)}#school`;
  // Next's file-convention opengraph-image route, same one already wired into
  // <head> og:image/twitter:image via generateMetadata's automatic handling —
  // built by hand here too because JSON-LD isn't part of that automatic
  // metadata pipeline and Event structured data needs its own `image`
  // (Google's Event rich-result eligibility explicitly lists image as
  // required/recommended).
  const eventImageUrl = `${siteUrl}/en${canonicalPath}/opengraph-image`;

  const mapPoint =
    school?.lat != null && school?.lng != null
      ? {
          id: `${event.id}-venue`,
          lat: school.lat,
          lng: school.lng,
          label: event.location ?? event.school_name,
          precision: school.geocode_precision ?? "pincode",
        }
      : null;

  const breadcrumbTrail = city
    ? [
        // A city-state (Delhi) has no separate state crumb (D-126), same
        // convention as the school page's own breadcrumb.
        ...(city.isCityState
          ? []
          : [{ name: city.stateName, href: statePath(locale, city.stateSlug) }]),
        { name: city.cityName, href: cityPath(locale, city.stateSlug, city.citySlug) },
        ...(school?.locality_slug && school?.locality_name
          ? [
              {
                name: school.locality_name,
                href: localityHref(locale, city.stateSlug, city.citySlug, school.locality_slug),
              },
            ]
          : []),
        { name: event.school_name, href: schoolPath(locale, event.school_slug) },
      ]
    : [{ name: event.school_name, href: schoolPath(locale, event.school_slug) }];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ...breadcrumbTrail.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: `${siteUrl}${crumb.href}`,
      })),
      {
        "@type": "ListItem",
        position: breadcrumbTrail.length + 1,
        name: event.title,
        item: canonicalUrl,
      },
    ],
  };

  // Full postal address for the venue: reuses the school's own verified
  // address/pincode/city/state (same fields schoolJsonLd on the school page
  // itself emits) rather than leaving location as an unstructured name —
  // Google's Event guidelines want a real address on the Place, not just a
  // label. `location`'s free-text name (e.g. "School auditorium") stays the
  // Place's own name; the address is the school's, since every event on this
  // site happens at or through its hosting school.
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: event.title,
    description:
      event.description ?? `${EVENT_TYPE_LABEL[event.event_type]} at ${event.school_name}`,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus:
      status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location ?? event.school_name,
      ...(school?.address
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: school.address,
              addressLocality: school.locality_name ?? city?.cityName,
              postalCode: school.pincode ?? undefined,
              addressRegion: city?.stateName,
              addressCountry: "IN",
            },
          }
        : {}),
      ...(school?.lat != null && school?.lng != null
        ? { geo: { "@type": "GeoCoordinates", latitude: school.lat, longitude: school.lng } }
        : {}),
    },
    organizer: {
      "@type": "School",
      "@id": schoolNodeId,
      name: event.school_name,
      url: `${siteUrl}${schoolPath(locale, event.school_slug)}`,
    },
    image: [eventImageUrl],
  };

  const otherEvents = bundle
    ? (await getPublicSchoolEventsBySchoolId(event.school_id))
        .filter((e) => e.id !== event.id && !e.cancelled_at)
        .slice(0, 3)
    : [];

  const calendarUrl = googleCalendarUrl({
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    location: event.location,
    details: event.description ?? `${EVENT_TYPE_LABEL[event.event_type]} at ${event.school_name}`,
  });

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
        {breadcrumbTrail.map((crumb) => (
          <span key={crumb.name}>
            <Link href={crumb.href}>{crumb.name}</Link>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
          </span>
        ))}
        <span className="text-ink">{event.title}</span>
      </nav>

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
        {areaLabel !== "India" && <>, {areaLabel}</>}
      </p>

      {/* Schedule — the core "when" a visitor and a search engine both need,
        with an explicit IST label since this renders server-side and the
        visitor's own device timezone must never silently override it. */}
      <div className="mt-6 flex flex-col gap-1 rounded-md border border-rule p-4">
        <span className="text-meta font-semibold text-muted-ink">Date &amp; time</span>
        <p className="text-body font-semibold">
          {formatIst(event.starts_at, { dateStyle: "full", timeZone: "Asia/Kolkata" })}
        </p>
        <p className="text-body">
          {formatIst(event.starts_at, IST_TIME_ONLY)}
          {event.ends_at ? ` – ${formatIst(event.ends_at, IST_TIME_ONLY)}` : ""}
          <span className="text-muted-ink"> (IST)</span>
        </p>
        {status !== "completed" && status !== "cancelled" && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex h-10 w-fit items-center rounded-md border border-line-blue px-3.5 text-meta font-semibold text-ruled-blue hover:bg-margin-paper"
          >
            Add to Google Calendar →
          </a>
        )}
      </div>

      {/* Place — venue name plus the school's own verified address when
        available, same trust bar as the school page's own Location section:
        never a fabricated address, and the map only renders when real
        coordinates exist. */}
      {(event.location || school?.address) && (
        <div className="mt-4 flex flex-col gap-1 rounded-md border border-rule p-4">
          <span className="text-meta font-semibold text-muted-ink">Place</span>
          <p className="text-body font-semibold">{event.location ?? event.school_name}</p>
          {school?.address && <p className="text-body text-muted-ink">{school.address}</p>}
          {mapPoint && (
            <>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapPoint.lat},${mapPoint.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 w-fit font-semibold text-ruled-blue text-meta"
              >
                Get directions ↗
              </a>
              <div className="mt-2">
                <AreaMapLazy
                  points={[mapPoint]}
                  centerLat={mapPoint.lat}
                  centerLng={mapPoint.lng}
                  zoom={15}
                />
              </div>
            </>
          )}
        </div>
      )}

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

      {/* About the school — real substance instead of a bare link: the same
        facts the school's own page leads with, so this page stands on its
        own for a visitor who lands here straight from a search result. */}
      {school && (
        <div className="mt-8 flex flex-col gap-1.5 rounded-md border border-rule p-4">
          <span className="text-meta font-semibold text-muted-ink">About the school</span>
          <Link
            href={schoolPath(locale, event.school_slug)}
            className="font-display text-card font-semibold hover:text-ruled-blue"
          >
            {event.school_name}
          </Link>
          <p className="text-body text-muted-ink">
            {[
              bundle?.board?.board_name,
              formatGradeRange(school.min_class, school.max_class),
              areaLabel !== "India" ? areaLabel : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {otherEvents.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <span className="text-meta font-semibold text-muted-ink">
            More events at {event.school_name}
          </span>
          <div className="flex flex-col gap-2">
            {otherEvents.map((other) => (
              <Link
                key={other.id}
                href={eventPath(locale, other.event_slug)}
                className="flex items-center justify-between gap-3 rounded-md border border-rule p-3 hover:border-ruled-blue"
              >
                <span className="font-semibold">{other.title}</span>
                <span className="text-meta text-muted-ink">
                  {formatIst(other.starts_at, { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href={`${schoolPath(locale, event.school_slug)}#whats-happening-heading`}
            className="w-fit font-semibold text-ruled-blue text-meta"
          >
            See everything happening at {event.school_name} →
          </Link>
        </div>
      )}
    </div>
  );
}
