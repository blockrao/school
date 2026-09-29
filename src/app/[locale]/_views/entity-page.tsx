import type { Metadata } from "next";
import Link from "next/link";

import { EligibilityChecker } from "@/components/admissions/eligibility-checker";
import { ClaimStatusLink } from "@/components/claim-status-link";
import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { StatusPill } from "@/components/ui/badges";
import { ClaimCard } from "@/components/ui/claim-card";
import { CoverageCard } from "@/components/ui/coverage-card";
import { DeadlineMargin } from "@/components/ui/deadline-margin";
import { DecisionStrip } from "@/components/ui/decision-strip";
import { FieldError } from "@/components/ui/field-error";
import { FreshnessLine, NotYetPublished } from "@/components/ui/freshness-line";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { ProvenanceChip } from "@/components/ui/provenance-chip";
import { SaveButton } from "@/components/ui/save-button";
import { SchoolCard } from "@/components/ui/school-card";
import { ShareButton } from "@/components/ui/share-button";
import { EmptyState } from "@/components/ui/state-message";
import type { PublicSchoolAdmission } from "@/contracts";
import { getDictionary } from "@/i18n/dictionary";
import { t, tEnum } from "@/i18n/t";
import { describeAdmissionUpdateChanges } from "@/lib/admission-updates";
import { buildCoverage } from "@/lib/coverage";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getPublicAdmissionsBySchoolId,
  type getPublicLocalityBySlug,
  getPublicSchoolEventsBySchoolId,
  getPublicSchoolJobsBySchoolId,
  getPublicSchoolNewsBySchoolId,
  getRecentAdmissionUpdatesBySchoolId,
  getSimilarSchools,
  listLocalityNeighbors,
  listPublicSchoolsByLocality,
} from "@/lib/db/public-adapter";
import { listPublicSchoolTeam } from "@/lib/db/school-team";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { getShortlistedSchoolIds } from "@/lib/db/shortlist";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { buildDecisionStrip, selectPrimaryAdmission } from "@/lib/decision-strip";
import type { EligibilityCycle } from "@/lib/eligibility";
import { siteUrl } from "@/lib/env.server";
import { EVENT_STATUS_LABEL, eventTemporalStatus } from "@/lib/event-status";
import { normalizeExternalUrl } from "@/lib/external-url";
import { formatCurrency } from "@/lib/format";
import { formatGradeRange } from "@/lib/grades";
import { identityBand } from "@/lib/identity-band";
import { JOB_STATUS_LABEL, jobStatus } from "@/lib/job-status";
import { classifyAdmissionProvenance } from "@/lib/provenance";
import { recordBadge } from "@/lib/record-badge";
import { buildSchoolMetaDescription } from "@/lib/school-metadata";
import { localeCanonical } from "@/lib/seo";
import {
  cityPath,
  eventPath,
  jobPath,
  localityPath as localityHref,
  lp,
  newsPath,
  schoolPath,
  statePath,
  teacherPath,
} from "@/lib/urls";
import { sendEnquiry } from "./actions";
import type { ResolvedCity, ResolvedLocality, ResolvedSchool } from "./resolve";

export function localityMetadata(locale: string, resolved: ResolvedLocality): Metadata {
  const { locality, city } = resolved;
  return {
    title: `Schools in ${locality.name}, ${city.cityName} — SchoolOye`,
    description: `${locality.name}: schools, fees, facilities and admission dates in ${city.cityName}.`,
    alternates: {
      canonical: localeCanonical(
        locale,
        localityHref("en", city.stateSlug, city.citySlug, locality.slug),
      ),
    },
  };
}

/**
 * Increment 11 (Entity Page Quality) — description used to unconditionally
 * promise "board, grades, fees and admission dates" for every school
 * regardless of whether any of that was actually known (flagged during the
 * Gyan Deep Sr.sec. manual page audit — description building logic and its
 * rationale now live in buildSchoolMetaDescription, src/lib/school-metadata.ts).
 * Board is already fetched by getPublicSchoolBundle, so this needs no extra query.
 */
export function schoolMetadata(locale: string, resolved: ResolvedSchool): Metadata {
  const { bundle, city } = resolved;
  const { school, board } = bundle;
  const name = school.name_en ?? "School";
  const areaLabel = school.locality_name ?? city?.cityName ?? "India";
  const grades = formatGradeRange(school.min_class, school.max_class);

  return {
    title: `${name}, ${areaLabel} — SchoolOye`,
    description: buildSchoolMetaDescription({
      name,
      areaLabel,
      boardName: board?.board_name ?? null,
      grades,
    }),
    alternates: { canonical: localeCanonical(locale, schoolPath("en", school.slug)) },
  };
}

function schoolOrgType(maxClass: string | null): string {
  const maxNum = maxClass ? Number(maxClass.replace(/^c/, "")) : null;
  if (maxNum != null && maxNum <= 5) return "ElementarySchool";
  if (maxNum != null && maxNum >= 9) return "HighSchool";
  return "School";
}

function LocalityPageBody({
  locale,
  city,
  locality,
  schools,
  neighbors,
  boardNames,
  admissionDeadlines,
  shortlistedIds,
  now,
}: {
  locale: string;
  city: ResolvedCity;
  locality: NonNullable<Awaited<ReturnType<typeof getPublicLocalityBySlug>>>;
  schools: Awaited<ReturnType<typeof listPublicSchoolsByLocality>>;
  neighbors: Awaited<ReturnType<typeof listLocalityNeighbors>>;
  boardNames: Map<string, string>;
  admissionDeadlines: Map<string, string | null>;
  shortlistedIds: Set<string>;
  now: Date;
}) {
  const basePath = cityPath(locale, city.stateSlug, city.citySlug);
  const localityPath = localityHref(locale, city.stateSlug, city.citySlug, locality.slug);

  const mapPoints = schools.flatMap((school) => {
    if (school.lat == null || school.lng == null) return [];
    return [
      {
        id: school.id,
        lat: school.lat,
        lng: school.lng,
        label: school.name_en ?? "Name not yet published",
        href: schoolPath(locale, school.slug),
        precision: school.geocode_precision ?? "pincode",
      },
    ];
  });
  const mapCenter =
    locality.lat != null && locality.lng != null
      ? { lat: locality.lat, lng: locality.lng }
      : mapPoints[0]
        ? { lat: mapPoints[0].lat, lng: mapPoints[0].lng }
        : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: city.stateName,
        item: `${siteUrl}${statePath(locale, city.stateSlug)}`,
      },
      { "@type": "ListItem", position: 2, name: city.cityName, item: `${siteUrl}${basePath}` },
      { "@type": "ListItem", position: 3, name: locality.name, item: `${siteUrl}${localityPath}` },
    ],
  };

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
        <span>{city.stateName}</span>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <Link href={basePath}>{city.cityName}</Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{locality.name}</span>
      </nav>

      <h1 className="font-display text-title-m md:text-title-d">Schools in {locality.name}</h1>
      <p className="mt-1 text-body text-muted-ink">
        {locality.schoolCount} school{locality.schoolCount === 1 ? "" : "s"} · {city.cityName}
      </p>

      {mapCenter && (
        <div className="mt-5">
          <AreaMapLazy
            points={mapPoints}
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            zoom={13}
          />
          <p className="mt-1.5 text-meta text-muted-ink">
            Approximate areas, not exact addresses — schools here are geocoded to locality
            precision.
          </p>
        </div>
      )}

      <div className="mt-6">
        {schools.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => {
              const board = boardNames.get(school.id);
              const grades = formatGradeRange(school.min_class, school.max_class);
              const meta = board ? `${board} · ${grades}` : grades;

              const closesOn = admissionDeadlines.get(school.id);
              const deadline = { closesAt: closesOn ? new Date(closesOn) : null };
              const pill = deadlineToPill(deadlineState(deadline, now));

              return (
                <SchoolCard
                  key={school.id}
                  href={schoolPath(locale, school.slug)}
                  name={school.name_en ?? "Name not yet published"}
                  meta={meta}
                  now={now}
                  deadline={deadline}
                  status={<StatusPill status={pill.status}>{pill.label}</StatusPill>}
                  fee="Not yet published"
                  freshness={<NotYetPublished />}
                  actions={
                    <SaveButton
                      schoolId={school.id}
                      saved={shortlistedIds.has(school.id)}
                      locale={locale}
                    />
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No published schools here yet"
            description="Schools appear here once they're verified and published."
            nextStepLabel={`Browse all schools in ${city.cityName}`}
            nextStepHref={basePath}
          />
        )}
      </div>

      {neighbors.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-card md:text-section">Nearby</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {neighbors.map((neighbor) => (
              <Link
                key={neighbor.slug}
                href={localityHref(locale, city.stateSlug, city.citySlug, neighbor.slug)}
                className="flex min-h-10 items-center rounded-md border border-rule bg-copy-white px-3 text-body font-medium hover:border-ruled-blue"
              >
                {neighbor.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export async function LocalityView({
  locale,
  resolved,
}: {
  locale: string;
  resolved: ResolvedLocality;
}) {
  const now = new Date();
  const { city, locality } = resolved;
  const [schools, neighbors] = await Promise.all([
    listPublicSchoolsByLocality(locality.id),
    listLocalityNeighbors(locality.slug),
  ]);
  const schoolIds = schools.map((s) => s.id);
  const [boardNames, admissionDeadlines, shortlistedIds] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
    getShortlistedSchoolIds(schoolIds),
  ]);

  return (
    <LocalityPageBody
      locale={locale}
      city={city}
      locality={locality}
      schools={schools}
      neighbors={neighbors}
      boardNames={boardNames}
      admissionDeadlines={admissionDeadlines}
      shortlistedIds={shortlistedIds}
      now={now}
    />
  );
}

/** The canonical school entity page (/school/{slug}, D-121). */
export async function SchoolView({
  locale,
  resolved,
  rawSearchParams,
}: {
  locale: string;
  resolved: ResolvedSchool;
  rawSearchParams: { [key: string]: string | string[] | undefined };
}) {
  const now = new Date();
  const dict = await getDictionary(locale);
  // --- School entity page ---
  const { city, bundle } = resolved;
  const { school, board } = bundle;
  const affiliationNo = board?.affiliation_no ?? null;
  const name = school.name_en ?? "Name not yet published";
  const grades = formatGradeRange(school.min_class, school.max_class);
  const canonicalPath = schoolPath(locale, school.slug);

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  const [
    admissions,
    shortlistedIdsSet,
    similarSchoolsRaw,
    team,
    news,
    events,
    jobs,
    recentAdmissionUpdates,
  ] = await Promise.all([
    getPublicAdmissionsBySchoolId(school.id),
    getShortlistedSchoolIds([school.id]),
    // Increment 11 (SDP-21) — locality-first, same-city fallback; see
    // getSimilarSchools()/listPublicSchoolsByCity() in public-adapter.ts.
    getSimilarSchools(school),
    listPublicSchoolTeam(school.id),
    // Increment 10 — api.public_school_news (db/views/095_public_school_news.sql):
    // already filtered to review='approved'/published school/published_at not null.
    getPublicSchoolNewsBySchoolId(school.id),
    // SEO/GEO follow-up (29 Sep 2026) — api.public_school_events
    // (db/views/102_public_school_events.sql): every event for this school,
    // regardless of site-wide /events listing status (own-page visibility has
    // no ops gate).
    getPublicSchoolEventsBySchoolId(school.id),
    // 29 Sep 2026 — api.public_school_jobs (db/views/104_public_school_jobs.sql):
    // every job posting for this school, regardless of site-wide /jobs listing
    // status (own-page visibility has no ops gate — same pattern as events).
    getPublicSchoolJobsBySchoolId(school.id),
    // Increment 10 — api.public_admission_updates (db/views/096_public_admission_updates.sql):
    // already scoped to admission_cycles-only, allowlisted fields, real changes only.
    getRecentAdmissionUpdatesBySchoolId(school.id),
  ]);
  const similarSchools = similarSchoolsRaw.filter((s) => s.id !== school.id).slice(0, 4);

  // Increment 10 — eligibility checker input. Mirrors exams/[slug]/page.tsx's
  // toEligibilityCycles exactly (same shape, same deadlineState/deadlineToPill use);
  // only cycles that actually carry a dob window render a checkable row. There's no
  // per-cycle id exposed by api.public_school_admissions (unlike the exams view's
  // cycle_id) — academic_year+class_code is already this page's de-facto cycle key
  // (used as the admissions list's own React key above), and is unique within one
  // school's admissions list.
  const eligibilityCycles: EligibilityCycle[] = admissions
    .filter((cycle) => cycle.dob_from && cycle.dob_to)
    .map((cycle) => {
      const pill = deadlineToPill(
        deadlineState(
          {
            opensAt: cycle.opens_on ? new Date(cycle.opens_on) : null,
            closesAt: cycle.closes_on ? new Date(cycle.closes_on) : null,
          },
          now,
        ),
      );
      return {
        id: `${cycle.academic_year}-${cycle.class_code}`,
        label: `${cycle.academic_year} · Class ${cycle.class_code.replace(/^c/, "")}`,
        dobFrom: cycle.dob_from,
        dobTo: cycle.dob_to,
        applyStatus: pill.status,
        formUrl: cycle.form_url,
      };
    });

  const enquirySent = rawSearchParams.enquiry_sent === "1";
  const enquiryError = rawSearchParams.enquiry_error === "failed";

  const breadcrumbTrail = city
    ? [
        // A city-state (Delhi) has no separate state crumb (D-126).
        ...(city.isCityState
          ? []
          : [{ name: city.stateName, href: statePath(locale, city.stateSlug) }]),
        { name: city.cityName, href: cityPath(locale, city.stateSlug, city.citySlug) },
        ...(school.locality_slug && school.locality_name
          ? [
              {
                name: school.locality_name,
                href: localityHref(locale, city.stateSlug, city.citySlug, school.locality_slug),
              },
            ]
          : []),
      ]
    : [];

  // A school can carry more than one live admission_cycles row (e.g. a
  // closed Nursery cycle alongside a separately-open Class XI cycle — the
  // DAV Public School Gurugram real-data test). `admissions[0]` picks
  // whichever sorts first by closes_on, which is not necessarily the one
  // still actionable; selectPrimaryAdmission prefers an open/upcoming cycle
  // over a closed one.
  const primaryAdmission: PublicSchoolAdmission | undefined = selectPrimaryAdmission(admissions);

  // Increment 7: the header used to carry its own admissions-urgency
  // StatusPill (computed from primaryAdmission's dates via deadlineToPill),
  // duplicating exactly what the Decision Strip's Admissions slot already
  // shows. Removed the header's render per the ownership decision — Header
  // stays compact identity context, Decision Strip is the canonical owner
  // of "is admissions open right now." The underlying admissions data/query
  // is unchanged; only this one rendering was removed.

  const verifiedAt = school.last_verified_at ? new Date(school.last_verified_at) : null;
  const badge = recordBadge(school.claim, school.verification, verifiedAt);
  const identity = identityBand(school.claim, school.verification);
  const decisionSlots = buildDecisionStrip({
    admission: primaryAdmission
      ? {
          academic_year: primaryAdmission.academic_year,
          class_code: primaryAdmission.class_code,
          opens_on: primaryAdmission.opens_on,
          closes_on: primaryAdmission.closes_on,
          status: primaryAdmission.status,
        }
      : null,
    school: {
      min_class: school.min_class,
      max_class: school.max_class,
      locality_name: school.locality_name,
      address: school.address,
    },
    cityName: city?.cityName ?? null,
    now,
  });

  const coverageTopics = buildCoverage(decisionSlots, {
    hasIdentity: school.name_en != null,
    hasBoardAffiliation: board?.board_name != null,
    hasContact: Boolean(
      (school.phone && school.phone.length > 0) ||
        (school.email && school.email.length > 0) ||
        school.website,
    ),
    hasStaff: team.length > 0,
  });

  const mapPoint =
    school.lat != null && school.lng != null
      ? {
          id: school.id,
          lat: school.lat,
          lng: school.lng,
          label: name,
          precision: school.geocode_precision ?? "pincode",
        }
      : null;

  // Increment 10R — every external href/JSON-LD URL built from the stored
  // `website` value goes through this once, here, rather than being
  // re-normalized (or not) at each call site. See external-url.ts's header
  // for why: most stored website values have no scheme.
  const websiteUrl = normalizeExternalUrl(school.website);

  // Increment 11 (SDP-05, resolved) — "WhatsApp School" secondary CTA. This was
  // deferred as an explicit exception in the Production Closure milestone because
  // no schema field exists for a verified per-school WhatsApp channel, and policy
  // forbids deriving one from an ordinary phone number. Prav has since directed
  // this be a single platform-owned SchoolOye helpline number instead of a
  // per-school channel, which sidesteps that blocker entirely: it's the same
  // controlled-intermediary pattern as "Contact school", just over WhatsApp, and
  // needs no per-school data at all. Unlike the numberless `wa.me/?text=` "share"
  // links elsewhere on this page (EligibilityChecker, ShareSheet), this is a fixed
  // destination number, so the school name + canonical URL are pre-filled so the
  // helpline knows which school the enquiry is about.
  const whatsappHelplineNumber = "919999188022";
  const whatsappHref = `https://wa.me/${whatsappHelplineNumber}?text=${encodeURIComponent(
    `Hi SchoolOye, I'd like to know more about ${name} (${siteUrl}${canonicalPath}).`,
  )}`;

  const areaLabel = school.locality_name ?? city?.cityName ?? "India";
  const orgType = schoolOrgType(school.max_class);

  // Increment 11 (SDP-06/SDP-31) — structured-data promotion rule: a property is
  // only emitted when SchoolOye has a real, sourced value for it (an existing DB
  // column with real data), never a templated/inferred default and never a value
  // the visible page itself doesn't also show. See docs/ops/implementation-log.md
  // SDP-31 for the full rule this instance follows.
  const schoolNodeId = `${siteUrl}${canonicalPath}#school`;
  const schoolJsonLd = {
    "@context": "https://schema.org",
    "@type": orgType,
    // Increment 11 (SDP-06) — fragment id, distinct from the WebPage node below,
    // which owns the canonical URL itself. webPageJsonLd.mainEntity references
    // this by @id, giving the page a real WebPage -> mainEntity -> School graph
    // instead of one flat School node standing in for the page.
    "@id": schoolNodeId,
    name,
    ...(school.name_hi || school.aliases.length > 0
      ? { alternateName: [school.name_hi, ...school.aliases].filter(Boolean) }
      : {}),
    ...(school.about_en ? { description: school.about_en } : {}),
    ...(school.established_year ? { foundingDate: String(school.established_year) } : {}),
    ...(school.address
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
    ...(mapPoint
      ? { geo: { "@type": "GeoCoordinates", latitude: mapPoint.lat, longitude: mapPoint.lng } }
      : {}),
    // Increment 11 (SDP-04) — telephone/email dropped from structured data. SchoolOye is
    // the controlled intermediary now (contact routes through the enquiry form, not a
    // raw number/address anywhere on the page), so JSON-LD stays consistent with the
    // visible page rather than exposing what the UI deliberately no longer shows.
    // No SchoolOye/DB id (D-121 §10); the board affiliation no. is a public official identifier.
    ...(affiliationNo && board
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: `${board.board_name} affiliation no.`,
            value: affiliationNo,
          },
        }
      : {}),
    ...(board ? { memberOf: { "@type": "Organization", name: board.board_name } } : {}),
    ...(school.locality_name
      ? { areaServed: { "@type": "Place", name: school.locality_name } }
      : {}),
    url: `${siteUrl}${canonicalPath}`,
    ...(websiteUrl ? { sameAs: websiteUrl } : {}),
  };

  // Increment 11 (SDP-06) — the WebPage node that owns the canonical URL and
  // points at the School node above as its mainEntity. Previously the School
  // node stood in for the page itself (@id was the bare canonical URL with no
  // WebPage wrapper) — correct for a quick entity stub, but not the
  // WebPage -> mainEntity -> School graph the entity architecture calls for.
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}${canonicalPath}`,
    url: `${siteUrl}${canonicalPath}`,
    name: `${name}, ${areaLabel} — SchoolOye`,
    mainEntity: { "@id": schoolNodeId },
  };

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
        name,
        item: `${siteUrl}${canonicalPath}`,
      },
    ],
  };

  // Increment 11 (SDP-03/HP-03) — FAQPage JSON-LD removed. These questions never
  // appeared as visible on-page content (a visible-fact <-> structured-data
  // mismatch, SDP-09), and Google restricted FAQ rich results to authoritative
  // government/health sites in 2023 — there's no remaining upside to weigh
  // against that mismatch. The facts these questions restated (board, grades,
  // location, admission status) are already in schoolJsonLd/the visible page;
  // nothing is lost by removing the synthetic Q&A wrapper around them.

  // Increment 10 — real sections only, in page order, used to build both the
  // shortcuts row and the sub-nav below from one list rather than two
  // hand-maintained arrays that could drift apart. Each entry's `show` mirrors
  // the exact same condition already used to render that section further
  // down the page — never a duplicated/looser check that could link to a
  // section that doesn't actually render.
  // Increment 10R — reordered to match the page's actual top-to-bottom DOM
  // order exactly (the Increment 10 audit found this list didn't: it listed
  // Admissions before School facts while the page has always rendered Facts
  // first). A destination-aware nav that misstates document order is a
  // correctness bug, not a style choice — this list is the single source of
  // truth for both the shortcuts row and the sticky sub-nav below, so fixing
  // it here fixes both at once. Keep this in sync with the JSX order any
  // time a main-column section is added, removed, or moved.
  const sections: { id: string; label: string; show: boolean }[] = [
    { id: "facts-heading", label: "School facts", show: true },
    { id: "admissions-heading", label: "Admissions", show: true },
    {
      id: "admission-updates-heading",
      label: "Recent updates",
      show: recentAdmissionUpdates.length > 0,
    },
    { id: "news-heading", label: "News", show: news.length > 0 },
    { id: "events-heading", label: "Events", show: events.length > 0 },
    { id: "jobs-heading", label: "Jobs", show: jobs.length > 0 },
    { id: "location-heading", label: "Location", show: Boolean(school.address || mapPoint) },
    { id: "teachers-heading", label: "Teachers", show: team.length > 0 },
    { id: "coverage-heading", label: "What SchoolOye knows", show: true },
    { id: "similar-heading", label: "Similar schools", show: similarSchools.length > 0 },
    { id: "contact-heading", label: "Contact", show: true },
  ].filter((s) => s.show);

  return (
    <div className="[container-type:inline-size] bg-so-bg font-so-sans text-so-ink">
      <div className="mx-auto max-w-(--container-read) px-4 py-6 md:px-10 md:py-9">
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }}
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
          <span className="text-ink">{name}</span>
        </nav>

        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:gap-4">
          <PhotoPlaceholder className="hidden h-24 w-32 shrink-0 sm:block" />
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-meta font-semibold ${identity.state === "verified" ? "text-board-green" : "text-muted-ink"}`}
            >
              {identity.heading}
            </span>
            <span className="text-meta text-slate">{identity.description}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-rule pb-6">
          <h1 className="font-display text-title-m md:text-title-d">
            {name}
            {school.name_hi && (
              <span className="ml-2 font-normal text-body text-muted-ink" lang="hi">
                {school.name_hi}
              </span>
            )}
          </h1>
          <p className="text-body text-muted-ink">
            {[
              board?.board_name,
              grades,
              tEnum(dict, "management", school.management),
              tEnum(dict, "gender", school.gender),
            ]
              .filter(Boolean)
              .join(" · ") || t(dict, "common.not_yet_published")}
            {school.locality_name
              ? ` · ${school.locality_name}${city ? `, ${city.cityName}` : ""}`
              : city
                ? ` · ${city.cityName}`
                : ""}
          </p>
          {/* Increment 7: provenance/freshness grouped here with the record badge —
            "where did this record come from, and when" is one trust signal, not
            a School-facts row and a separate header chip. Reuses recordBadge's
            own verifiedAt/date logic; FreshnessLine falls back to "Not yet
            verified" text exactly as it did under School facts before. */}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span
              className={`text-meta font-semibold ${badge.official ? "text-board-green" : "text-muted-ink"}`}
            >
              {badge.official ? "✓ " : ""}
              {badge.label}
            </span>
            {verifiedAt ? (
              <FreshnessLine
                source="SchoolOye verification"
                retrievedAt={verifiedAt}
                verifiedAt={verifiedAt}
                now={now}
              />
            ) : (
              <span className="text-meta text-slate">Not yet verified</span>
            )}
            {/* Increment 11 (SDP-03) — the header-level ProvenanceChip is removed.
              It read the exact same two columns as recordBadge/FreshnessLine just
              above and restated the identical fact a third time ("Not individually
              verified" next to "Compiled by SchoolOye from public records" / "Not
              yet verified") — four overlapping trust messages stacked before any
              content, flagged independently by two separate audits this session.
              recordBadge + FreshnessLine already carry this story; nothing is lost
              by dropping the chip here. Kept on admission cycles below, where it
              carries a genuinely distinct, cycle-level signal. */}
            <ShareButton title={name} />
            <SaveButton
              schoolId={school.id}
              saved={shortlistedIdsSet.has(school.id)}
              locale={locale}
              span="w-fit px-4"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-meta">
            <Link
              href={lp(locale, `/compare?ids=${school.id}`)}
              className="font-semibold text-ruled-blue"
            >
              Compare
            </Link>
            <ClaimStatusLink schoolId={school.id} isClaimed={school.claim === "claimed"} />
          </div>
        </div>

        {/* Increment 10 — shortcuts row (design block 3): jump links built from
          the same `sections` list the sub-nav below uses, so a link only ever
          appears for a section that actually renders further down the page.
          Plain anchor links — no client JS, no scroll-position state — since
          nothing here needs more than the browser's native #id jump. */}
        <div className="flex flex-wrap gap-2 py-4">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex min-h-11 items-center gap-2 rounded-md border border-so-line2 bg-so-surface px-3.5 text-meta font-medium text-so-ink hover:border-so-ink3"
            >
              {s.label}
            </a>
          ))}
        </div>

        {/* Increment 10 — sub-nav (design block 4): a sticky, non-scrollspy
          in-page nav grouping the same real sections. The design's version
          highlights the currently-scrolled-to group and hides on scroll-down
          via client-side IntersectionObserver/scroll-listener logic; that
          interaction layer is deliberately left for a follow-up pass rather
          than built here — plain sticky anchor links already give a reader
          working in-page navigation, and adding scroll-tracking state is a
          separate, self-contained piece of work this increment doesn't need
          to bundle in to be useful. Documented here rather than silently
          dropped from the design. */}
        <nav
          aria-label="Page sections"
          className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-so-line border-t border-b bg-so-bg px-4 [scrollbar-width:none] md:-mx-10 md:px-10"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex min-h-12 flex-none items-center whitespace-nowrap px-3 text-body text-so-ink3 hover:text-so-ink"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="py-6">
          <h2 className="mb-3 font-display text-card font-semibold">At a glance</h2>
          <DecisionStrip slots={decisionSlots} />
        </div>

        {/* Increment 11 (SDP-04) — controlled-intermediary contact model, locked by Prav:
          SchoolOye captures intent and routes it, rather than handing out the school's
          raw phone number. The old "Call" tel: pill exposed school.phone directly and is
          removed; "Contact School" (this anchor, already routed through the existing
          `sendEnquiry` server action below) is now the primary action and comes first,
          per the Discover -> Understand -> Contact -> Enquire -> Apply hierarchy. Website
          and Directions remain controlled actions to the school's own official channels.
          A distinct per-cycle "Apply" action already exists (the "Application form ↗"
          link inside Admissions, gated on cycle.form_url) — this pill is the general
          contact path, not admissions-specific, so it's unconditional. "WhatsApp School"
          (secondary CTA) routes to SchoolOye's own platform WhatsApp helpline (not a
          per-school channel — see whatsappHref above and docs/ops/implementation-log.md,
          SDP-05, resolved), so it's unconditional too. */}
        <div className="flex flex-wrap gap-2 pb-6">
          <a
            href="#enquiry-heading"
            className="flex h-10 items-center rounded-md border border-rule px-4 text-meta font-semibold hover:border-ruled-blue"
          >
            Contact school
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex h-10 items-center rounded-md border border-rule px-4 text-meta font-semibold hover:border-ruled-blue"
          >
            WhatsApp School
          </a>
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex h-10 items-center rounded-md border border-rule px-4 text-meta font-semibold hover:border-ruled-blue"
            >
              Website
            </a>
          )}
          {mapPoint && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapPoint.lat},${mapPoint.lng}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex h-10 items-center rounded-md border border-rule px-4 text-meta font-semibold hover:border-ruled-blue"
            >
              Directions
            </a>
          )}
        </div>

        <div className="grid gap-6 py-6 md:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-6">
            {school.about_en && (
              <section aria-labelledby="about-heading" className="flex flex-col gap-2">
                <h2 id="about-heading" className="font-display text-card font-semibold">
                  {/* D7 / spec §7.2 item 7: claimed pages show the school's own text under
                    "From the school"; unclaimed pages show SchoolOye's factual summary
                    under "About this school" — never attribute unverified text to the
                    school itself. */}
                  {school.claim === "claimed" ? "From the school" : "About this school"}
                </h2>
                <p className="text-body leading-relaxed">{school.about_en}</p>
              </section>
            )}

            <section aria-labelledby="facts-heading" className="flex flex-col gap-3">
              <h2 id="facts-heading" className="font-display text-card font-semibold">
                School facts
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body">
                <div>
                  <dt className="text-meta font-semibold text-muted-ink">
                    {t(dict, "school_page.board_heading")}
                  </dt>
                  <dd>{board?.board_name ?? <NotYetPublished />}</dd>
                </div>
                <div>
                  <dt className="text-meta font-semibold text-muted-ink">Affiliation no.</dt>
                  <dd>{affiliationNo ?? <NotYetPublished />}</dd>
                </div>
                {/* Increment 7: "Grades" row removed — it rendered the exact same
                  `grades` string already shown in the header and the Decision
                  Strip's Entry classes slot, with no added value (unlike Board,
                  which adds the affiliation number here). "Fee range" row
                  removed too — the Decision Strip and Coverage Card both already
                  say "Not yet verified" for this; a third identical row added
                  nothing. See docs/ops/implementation-log.md Increment 7. */}
                <div>
                  <dt className="text-meta font-semibold text-muted-ink">Established</dt>
                  <dd>{school.established_year ?? <NotYetPublished />}</dd>
                </div>
                <div>
                  <dt className="text-meta font-semibold text-muted-ink">Medium</dt>
                  <dd>
                    {school.medium && school.medium.length > 0 ? (
                      school.medium.join(", ")
                    ) : (
                      <NotYetPublished />
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-labelledby="admissions-heading"
              className={admissions.length > 0 ? "flex flex-col gap-3" : "flex items-center gap-2"}
            >
              <h2
                id="admissions-heading"
                className={
                  admissions.length > 0
                    ? "font-display text-card font-semibold"
                    : "text-meta font-semibold text-muted-ink"
                }
              >
                Admissions
              </h2>
              {admissions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {admissions.map((cycle) => {
                    const cycleDeadline = {
                      opensAt: cycle.opens_on ? new Date(cycle.opens_on) : null,
                      closesAt: cycle.closes_on ? new Date(cycle.closes_on) : null,
                    };
                    return (
                      <div
                        key={`${cycle.academic_year}-${cycle.class_code}`}
                        className="flex items-center gap-3 rounded-md border border-rule p-3"
                      >
                        <DeadlineMargin
                          {...cycleDeadline}
                          now={now}
                          className="h-20 w-32 shrink-0"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">
                            {cycle.academic_year} · Class {cycle.class_code.replace(/^c/, "")}
                          </span>
                          <span className="text-meta text-muted-ink">
                            {cycle.form_mode === "online" ? "Online form" : "Offline form"}
                            {cycle.registration_fee != null
                              ? ` · ${formatCurrency(cycle.registration_fee)}`
                              : ""}
                          </span>
                          {cycle.form_url && (
                            <a
                              href={cycle.form_url}
                              className="font-semibold text-ruled-blue text-meta"
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                            >
                              Application form ↗
                            </a>
                          )}
                          {/* Increment 10 — per-cycle ProvenanceChip. `verification`
                            and `last_checked_at` are already exposed by
                            api.public_school_admissions (020_public_school_admissions.sql)
                            — no view change needed for this one. */}
                          <ProvenanceChip
                            tier={classifyAdmissionProvenance(cycle.verification)}
                            checkedAt={cycle.last_checked_at}
                            className="mt-0.5"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Increment 7: compact, inline unavailable state — this used to be a
                // full-weight section (its own heading + block) for a one-line
                // null result, the same "looks substantive but says nothing" issue
                // flagged for empty modules generally. The Decision Strip above
                // already gives this a proper "Not yet verified" treatment.
                <span className="text-meta text-slate">· Dates not yet published</span>
              )}
              {/* Increment 10 — admissions-deepening. Reuses the exact component/props
                shape already built and shipped for exams/[slug]/page.tsx unchanged;
                only the data source (this school's own admissions, filtered to cycles
                that actually carry a dob window) differs. Renders nothing when no
                cycle has dob_from/dob_to populated yet (the current production data —
                see the Increment 10 migration-application log entry). */}
              {eligibilityCycles.length > 0 && (
                <EligibilityChecker
                  cycles={eligibilityCycles}
                  helpHref={lp(locale, "/admissions/help")}
                  shareHref={`https://wa.me/?text=${encodeURIComponent(
                    `Check if your child is eligible for ${name}: ${siteUrl}${canonicalPath}`,
                  )}`}
                  className="mt-3"
                />
              )}
            </section>

            {/* Increment 10R — Claim card, mobile position. Design (C16/D2): "Claim
              card ... after Fees on mobile" — Fees itself stays deferred (Prav's
              standing decision), so this sits where Fees would otherwise have been:
              directly after Admissions. `md:hidden` — the desktop instance renders
              in the right rail instead (see the `<aside>` below); same component,
              same data, two responsive positions rather than one reflowed layout. */}
            {school.claim === "unclaimed" && (
              <ClaimCard schoolId={school.id} schoolName={name} className="md:hidden" />
            )}

            {/* Increment 10 — "Recent admission updates". Reads only
              api.public_admission_updates (db/views/096_public_admission_updates.sql),
              which already excludes school-level audit noise, raw before/after, actor,
              and no-op rows — nothing further to filter here. Sits directly after
              Admissions since it's the same subject (this school's admission cycles).
              Increment 10R: the description line now names every allowlisted field
              that actually changed (status/opens_on/closes_on/results_on), not just
              status — a row where only a date changed used to render as a
              content-free "Admission updated" line with nothing saying what changed. */}
            {recentAdmissionUpdates.length > 0 && (
              <section aria-labelledby="admission-updates-heading" className="flex flex-col gap-3">
                <h2 id="admission-updates-heading" className="font-display text-card font-semibold">
                  Recent admission updates
                </h2>
                <ul className="flex flex-col gap-2">
                  {recentAdmissionUpdates.map((u) => (
                    <li
                      key={u.audit_id}
                      className="flex flex-col gap-0.5 rounded-md border border-rule p-3"
                    >
                      <span className="text-body">
                        {u.change_type === "created"
                          ? "Admission cycle added"
                          : "Admission updated"}
                        {" — "}
                        {u.academic_year} · Class {u.class_code.replace(/^c/, "")}
                      </span>
                      <span className="text-meta text-muted-ink">
                        {describeAdmissionUpdateChanges(u)}
                      </span>
                      <span className="text-meta text-muted-ink">
                        {new Date(u.occurred_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Increment 10R — News, moved up from just-before-Coverage (flagged in the
              Increment 10 audit as inconsistent with the design's "What's happening"
              grouping, C19) to sit directly alongside Admissions/Recent admission
              updates instead — the page's other "what's currently happening at this
              school" content. This does not build the design's unified card or the
              /events, /news hub routes it references (Events stays out of scope per
              Prav's standing decision; a school-page-local News list is what's
              authorized) — it only repositions the existing, unchanged News section
              to a hierarchy position consistent with that grouping. Still renders
              nothing when empty — no placeholder box. */}
            {news.length > 0 && (
              <section aria-labelledby="news-heading" className="flex flex-col gap-3">
                <h2 id="news-heading" className="font-display text-card font-semibold">
                  News
                </h2>
                <div className="flex flex-col gap-3">
                  {news.map((post) => (
                    <article
                      key={post.id}
                      className="flex flex-col gap-1 rounded-md border border-rule p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Link
                          href={newsPath(locale, post.post_slug)}
                          className="font-display font-semibold hover:text-ruled-blue"
                        >
                          {post.title}
                        </Link>
                        {post.kind === "press" && (
                          <span className="rounded-full border border-rule px-2 py-0.5 text-meta text-muted-ink">
                            Press
                          </span>
                        )}
                        {post.tier !== "organic" && (
                          <span className="rounded-full border border-ruled-blue px-2 py-0.5 text-meta font-semibold text-ruled-blue">
                            {post.tier === "featured" ? "Featured" : "Press release"}
                          </span>
                        )}
                      </div>
                      <p className="text-body text-muted-ink">{post.body}</p>
                      <div className="flex items-center gap-2 text-meta text-muted-ink">
                        <span>
                          {new Date(post.published_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {post.source_url && (
                          <>
                            <span>·</span>
                            <a
                              href={post.source_url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="font-semibold text-ruled-blue"
                            >
                              Source ↗
                            </a>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* SEO/GEO follow-up (29 Sep 2026): shows every event for this school
              regardless of whether it has been (or ever will be) listed on the
              site-wide /events aggregator — own-page visibility has no ops gate.
              Each event links to its own canonical page only once it has one
              worth linking to publicly (an approved listing); before that, the
              event still renders inline here, just without a link out, since the
              canonical page's content is identical either way and linking pre-
              listing would surface an unreviewed page as if it were a normal
              search result. */}
            {events.length > 0 && (
              <section aria-labelledby="events-heading" className="flex flex-col gap-3">
                <h2 id="events-heading" className="font-display text-card font-semibold">
                  Events
                </h2>
                <div className="flex flex-col gap-3">
                  {events.map((event) => {
                    const status = eventTemporalStatus(
                      {
                        startsAt: new Date(event.starts_at),
                        endsAt: event.ends_at ? new Date(event.ends_at) : null,
                        cancelledAt: event.cancelled_at ? new Date(event.cancelled_at) : null,
                      },
                      now,
                    );
                    const isListed = event.listing_review === "approved";
                    const title = <span className="font-display font-semibold">{event.title}</span>;
                    return (
                      <article
                        key={event.id}
                        className="flex flex-col gap-1 rounded-md border border-rule p-3"
                      >
                        <div className="flex items-center gap-2">
                          {isListed ? (
                            <Link
                              href={eventPath(locale, event.event_slug)}
                              className="font-display font-semibold hover:text-ruled-blue"
                            >
                              {event.title}
                            </Link>
                          ) : (
                            title
                          )}
                          <span className="rounded-full border border-rule px-2 py-0.5 text-meta text-muted-ink">
                            {EVENT_STATUS_LABEL[status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-meta text-muted-ink">
                          <span>
                            {new Date(event.starts_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {event.location && (
                            <>
                              <span>·</span>
                              <span>{event.location}</span>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {jobs.length > 0 && (
              <section aria-labelledby="jobs-heading" className="flex flex-col gap-3">
                <h2 id="jobs-heading" className="font-display text-card font-semibold">
                  Jobs
                </h2>
                <div className="flex flex-col gap-3">
                  {jobs.map((job) => {
                    const status = jobStatus(
                      {
                        closesAt: job.closes_at ? new Date(job.closes_at) : null,
                        filledAt: job.filled_at ? new Date(job.filled_at) : null,
                        cancelledAt: job.cancelled_at ? new Date(job.cancelled_at) : null,
                      },
                      now,
                    );
                    // Same reasoning as the Events section above: only link to
                    // the canonical /jobs/{slug} page once it's actually been
                    // approved for the site-wide listing — an unlisted job's
                    // canonical page still resolves for anyone with the direct
                    // link, but this page shouldn't surface it as if it were.
                    const isListed = job.listing_review === "approved";
                    const title = <span className="font-display font-semibold">{job.title}</span>;
                    return (
                      <article
                        key={job.id}
                        className="flex flex-col gap-1 rounded-md border border-rule p-3"
                      >
                        <div className="flex items-center gap-2">
                          {isListed ? (
                            <Link
                              href={jobPath(locale, job.job_slug)}
                              className="font-display font-semibold hover:text-ruled-blue"
                            >
                              {job.title}
                            </Link>
                          ) : (
                            title
                          )}
                          <span className="rounded-full border border-rule px-2 py-0.5 text-meta text-muted-ink">
                            {JOB_STATUS_LABEL[status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-meta text-muted-ink">
                          {job.subject && <span>{job.subject}</span>}
                          {job.location && (
                            <>
                              {job.subject && <span>·</span>}
                              <span>{job.location}</span>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {(school.address || mapPoint) && (
              <section aria-labelledby="location-heading" className="flex flex-col gap-3">
                <h2 id="location-heading" className="font-display text-card font-semibold">
                  {t(dict, "school_page.location_heading")}
                </h2>
                <p className="text-body">
                  {school.address ?? t(dict, "common.address_not_yet_published")}
                  {mapPoint && (
                    <span className="text-meta text-muted-ink">
                      {t(dict, "school_page.location_precision_note", {
                        precision: school.geocode_precision ?? "pincode",
                      })}
                    </span>
                  )}
                </p>
                {/* Increment 10 — wires the existing AreaMapLazy island (already
                  built and used on the locality page, src/lib/db/public-adapter
                  LocalityPageBody) onto the entity page too: same component,
                  same lazy-loaded MapLibre island, single-point instead of a
                  locality's many points. No new map code. */}
                {mapPoint && (
                  <AreaMapLazy
                    points={[
                      {
                        id: mapPoint.id,
                        lat: mapPoint.lat,
                        lng: mapPoint.lng,
                        label: name,
                        precision: mapPoint.precision,
                      },
                    ]}
                    centerLat={mapPoint.lat}
                    centerLng={mapPoint.lng}
                    zoom={15}
                  />
                )}
              </section>
            )}

            {team.length > 0 && (
              <section aria-labelledby="teachers-heading" className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 id="teachers-heading" className="font-display text-card font-semibold">
                    Teachers at {name}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {team.map((t) => (
                    <Link
                      key={t.teacherId}
                      href={teacherPath(locale, t.slug)}
                      className="flex flex-col gap-0.5 rounded-md border border-rule p-3 hover:border-ruled-blue"
                    >
                      <span className="font-display font-semibold">{t.fullName}</span>
                      <span className="text-meta text-muted-ink">
                        {[t.subject, t.level].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Increment 7: Coverage Card moved here — after the substantive
              "answer" sections (Admissions, About, School facts, Location,
              Teachers) and before Similar schools/discovery, per the locked
              page hierarchy: identity -> decision -> action -> answers ->
              coverage/trust -> discovery. It used to sit directly under the
              Decision Strip, ahead of any substantive content, which read
              more like a database-completeness report than a school page. */}
            <CoverageCard
              schoolName={name}
              topics={coverageTopics}
              schoolId={school.id}
              isClaimed={school.claim === "claimed"}
            />

            {similarSchools.length > 0 && (
              <section aria-labelledby="similar-heading" className="flex flex-col gap-3">
                <h2 id="similar-heading" className="font-display text-card font-semibold">
                  Similar schools nearby
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {similarSchools.map((s) => (
                    <Link
                      key={s.id}
                      href={schoolPath(locale, s.slug)}
                      className="flex flex-col gap-0.5 rounded-md border border-rule p-3 hover:border-ruled-blue"
                    >
                      <span className="font-display font-semibold">
                        {s.name_en ?? "Name not yet published"}
                      </span>
                      <span className="text-meta text-muted-ink">
                        {formatGradeRange(s.min_class, s.max_class)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Increment 10 — sticky rail (design block 19): position:sticky, CSS
            only. `top-20` clears the sticky sub-nav above (h-12 + border)
            plus a small gap so the rail never sits flush under it. */}
          <aside className="flex flex-col gap-4 md:sticky md:top-20 md:self-start">
            {/* Increment 10R — Claim card, desktop position (design D2: "Claim card
              moves to the rail" for a sparse/unclaimed record). `hidden md:flex` —
              the mobile instance renders inline after Admissions instead (above). */}
            {school.claim === "unclaimed" && (
              <ClaimCard schoolId={school.id} schoolName={name} className="hidden md:flex" />
            )}

            {/* Increment 11 (SDP-04) — controlled-intermediary contact model. Raw
              school.phone/school.email used to render here in plain text; SchoolOye is
              now the intermediary rather than a directory, so this card sends every
              contact intent through the enquiry form below (`#enquiry-heading`,
              `sendEnquiry`) instead of handing out the number/address directly. Website
              stays, since it points to the school's own official public channel, not a
              private contact detail. */}
            <section
              aria-labelledby="contact-heading"
              className="flex flex-col gap-2 rounded-md border border-rule p-4"
            >
              <h2 id="contact-heading" className="font-display text-card font-semibold">
                Contact
              </h2>
              <div className="flex flex-col gap-1.5 text-body">
                <div>
                  <span className="text-meta font-semibold text-muted-ink">Website: </span>
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      className="font-semibold text-ruled-blue"
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      {websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <NotYetPublished />
                  )}
                </div>
                <a href="#enquiry-heading" className="w-fit font-semibold text-ruled-blue">
                  Contact this school →
                </a>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="w-fit font-semibold text-ruled-blue"
                >
                  WhatsApp School →
                </a>
              </div>
            </section>

            <section
              aria-labelledby="enquiry-heading"
              className="flex flex-col gap-2 rounded-md border border-rule p-4"
            >
              <h2 id="enquiry-heading" className="font-display text-card font-semibold">
                Ask this school
              </h2>
              {enquirySent ? (
                <p className="text-body text-muted-ink">
                  Your question has been sent to the school. They'll get back to you directly.
                </p>
              ) : user ? (
                <form action={sendEnquiry} className="flex flex-col gap-3">
                  <input type="hidden" name="schoolId" value={school.id} />
                  <input type="hidden" name="returnPath" value={canonicalPath} />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-meta font-semibold text-muted-ink">
                      Class you're asking about (optional)
                    </span>
                    <select
                      name="classCode"
                      defaultValue=""
                      className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
                    >
                      <option value="">Any class</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={`c${n}`}>
                          Class {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-meta font-semibold text-muted-ink">Your question</span>
                    <textarea
                      name="message"
                      required
                      maxLength={1000}
                      rows={4}
                      className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
                    />
                  </label>
                  {enquiryError && (
                    <FieldError id="enquiry-error">
                      Something went wrong sending your question. Please try again.
                    </FieldError>
                  )}
                  <button
                    type="submit"
                    className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
                  >
                    Send question
                  </button>
                </form>
              ) : (
                <Link
                  href={lp(
                    locale,
                    `/sign-in?next=${encodeURIComponent(`${canonicalPath}#enquiry-heading`)}`,
                  )}
                  className="w-fit font-semibold text-ruled-blue"
                >
                  Sign in to ask this school a question
                </Link>
              )}
            </section>
          </aside>
        </div>

        {/* Increment 10 — footer disclaimer (design block 18): static, no data
          dependency. States what "Verified" does and doesn't mean, and the
          no-paid-listings line — the same trust framing the identity band and
          record badge already carry, restated once at the point a reader is
          most likely to be deciding whether to trust the page. */}
        <p className="border-t border-so-line py-6 text-meta text-so-ink3 leading-relaxed">
          Verified means SchoolOye has checked a fact against its source. It is not a rating or a
          recommendation of the school. SchoolOye carries no paid listings.
        </p>
      </div>
    </div>
  );
}
