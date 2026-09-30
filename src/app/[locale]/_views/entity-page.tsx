import type { Metadata } from "next";
import Link from "next/link";

import { EligibilityChecker } from "@/components/admissions/eligibility-checker";
import { TrackedApplyLink } from "@/components/admissions/tracked-apply-link";
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
import { SourceLine } from "@/components/ui/source-line";
import { EmptyState } from "@/components/ui/state-message";
import type { PublicSchoolAdmission } from "@/contracts";
import { getDictionary } from "@/i18n/dictionary";
import { t, tEnum } from "@/i18n/t";
import { describeAdmissionUpdateChanges } from "@/lib/admission-updates";
import { logAnalyticsEvent } from "@/lib/analytics";
import { buildCoverage } from "@/lib/coverage";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getPublicAdmissionsBySchoolId,
  getPublicFieldEvidenceBySchoolId,
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
import { EVENT_STATUS_LABEL } from "@/lib/event-status";
import { normalizeExternalUrl } from "@/lib/external-url";
import { formatCurrency } from "@/lib/format";
import { formatGradeRange } from "@/lib/grades";
import { identityBand } from "@/lib/identity-band";
import { JOB_STATUS_LABEL } from "@/lib/job-status";
import { classifyAdmissionProvenance } from "@/lib/provenance";
import { recordBadge } from "@/lib/record-badge";
import { buildSchoolActivityFeed, type SchoolActivityItem } from "@/lib/school-activity";
import { schoolAreaLabel } from "@/lib/school-area-label";
import {
  buildSchoolMetaDescription,
  meetsIndexabilityGate,
  schoolPageTitle,
} from "@/lib/school-metadata";
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
import { sendEnquiry, submitAdmissionLead } from "./actions";
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
  const grades = formatGradeRange(school.min_class, school.max_class);
  const areaLabel = schoolAreaLabel(school.locality_name, city?.cityName);
  return {
    // Title-metadata correction (29 Sep 2026) — see schoolPageTitle's header
    // comment (src/lib/school-metadata.ts) and seo-geo.md §3 for why this
    // replaced the bare "{Name}, {Area}" it had drifted to, and why it's the
    // generic-sections form rather than the old date/Fees-specific template.
    title: schoolPageTitle(name, areaLabel),
    description: buildSchoolMetaDescription({
      name,
      areaLabel,
      boardName: board?.board_name ?? null,
      grades,
    }),
    alternates: { canonical: localeCanonical(locale, schoolPath("en", school.slug)) },
    // Indexability & Metadata Alignment v1 (29 Sep 2026) — matches the pattern
    // already used by place-page.tsx/schools/compare: omit `robots` entirely
    // (indexable by default) rather than asserting `index: true`, and only
    // emit the tag at all for the noindex case.
    robots: meetsIndexabilityGate(school, board) ? undefined : { index: false, follow: true },
    // Shared Open Graph fields (29 Sep 2026) — schoolMetadata had no
    // `openGraph` block at all, and neither did the root layout, so
    // `og:site_name`/`og:locale` were never emitted anywhere on the site, not
    // just this page. Adding them here rather than at the layout level for
    // now since this is the one page this increment scoped; `og:title` /
    // `og:description` / `og:url` still come from Next's title/description/
    // metadataBase defaults, unaffected by this block. Locale is hard-coded
    // to the one locale actually served today (`schoolPath("en", ...)` above,
    // `localeCanonical`'s only real variant) — derive it from `locale` once a
    // second one is genuinely live, not before.
    openGraph: { siteName: "SchoolOye", locale: "en_IN" },
  };
}

/**
 * Structured-data freshness (SEO/GEO review, 29 Sep 2026, following the
 * UDISE+-default provenance decision): `dateModified` must reflect the most
 * recent *displayed, sourced* fact, not only `school.last_verified_at` — that
 * field is real only for schools with a formal verification event (locked
 * rule: never backfilled from provenance timestamps) and is null for most of
 * the corpus. Per-field evidence (UDISE+/SARAS provenance already rendered via
 * SourceLine) and admission-cycle changes (already rendered under "Recent
 * admission updates") are both real, dated, on-page facts and count too.
 * Returns null — omit the property — when nothing dated is known at all,
 * never a fabricated fallback like the build/request time.
 */
function latestOf(...dates: (Date | string | null | undefined)[]): Date | null {
  const times = dates
    .filter((d): d is Date | string => d != null)
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

/**
 * Correctness fix, same day: api.public_field_evidence (field_provenance)
 * covers many fields per school — 85,068 rows across 10,642 schools — but
 * this page only ever renders a SourceLine for two of them. Feeding
 * dateModified from every field in evidenceByField let an unrelated,
 * never-displayed field's old bulk-import row (e.g. name/phone/udise_code
 * provenance the page doesn't cite) inflate the page's claimed freshness even
 * though nothing a visitor or crawler can see had actually changed. Keep this
 * list in exact sync with the fields SourceLine is actually called for below.
 */
const PAGE_VISIBLE_EVIDENCE_FIELDS = ["established_year", "address"] as const;

function schoolOrgType(maxClass: string | null): string {
  const maxNum = maxClass ? Number(maxClass.replace(/^c/, "")) : null;
  if (maxNum != null && maxNum <= 5) return "ElementarySchool";
  if (maxNum != null && maxNum >= 9) return "HighSchool";
  return "School";
}

const activityDateFormat = { day: "numeric", month: "short", year: "numeric" } as const;

/** One card in the "What's happening" feed (src/lib/school-activity.ts) — a
 * News, Event or Job item, each still linking to its own domain's canonical
 * page and carrying only fields that already exist on its row. The "Source"
 * (event) and "Apply" (job) links are the one net-new bit here: both fields
 * already existed on the query results but weren't surfaced on this page —
 * same principle as News' existing Source link, not a new data source. */
function ActivityFeedItem({ item, locale }: { item: SchoolActivityItem; locale: string }) {
  const kindLabel: Record<SchoolActivityItem["kind"], string> = {
    news: "News",
    event: "Event",
    job: "Job",
  };
  const kindPill = (
    <span className="rounded-full border border-so-line2 bg-so-surface px-2 py-0.5 text-meta font-semibold text-so-ink3">
      {kindLabel[item.kind]}
    </span>
  );

  if (item.kind === "news") {
    const post = item.data;
    return (
      <article className="flex flex-col gap-1 rounded-md border border-rule p-3">
        <div className="flex flex-wrap items-center gap-2">
          {kindPill}
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
          <span>{new Date(post.published_at).toLocaleDateString("en-IN", activityDateFormat)}</span>
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
    );
  }

  if (item.kind === "event") {
    const event = item.data;
    return (
      <article className="flex flex-col gap-1 rounded-md border border-rule p-3">
        <div className="flex flex-wrap items-center gap-2">
          {kindPill}
          <Link
            href={eventPath(locale, event.event_slug)}
            className="font-display font-semibold hover:text-ruled-blue"
          >
            {event.title}
          </Link>
          <span className="rounded-full border border-rule px-2 py-0.5 text-meta text-muted-ink">
            {EVENT_STATUS_LABEL[item.status]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-meta text-muted-ink">
          <span>{new Date(event.starts_at).toLocaleDateString("en-IN", activityDateFormat)}</span>
          {event.location && (
            <>
              <span>·</span>
              <span>{event.location}</span>
            </>
          )}
          {event.source_url && (
            <>
              <span>·</span>
              <a
                href={event.source_url}
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
    );
  }

  const job = item.data;
  return (
    <article className="flex flex-col gap-1 rounded-md border border-rule p-3">
      <div className="flex flex-wrap items-center gap-2">
        {kindPill}
        <Link
          href={jobPath(locale, job.job_slug)}
          className="font-display font-semibold hover:text-ruled-blue"
        >
          {job.title}
        </Link>
        <span className="rounded-full border border-rule px-2 py-0.5 text-meta text-muted-ink">
          {JOB_STATUS_LABEL[item.status]}
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
        {job.apply_url && (
          <>
            {(job.subject || job.location) && <span>·</span>}
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold text-ruled-blue"
            >
              Apply ↗
            </a>
          </>
        )}
      </div>
    </article>
  );
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

  // P1.8 follow-up (29 Sep 2026) — the school entity page is the one page in
  // this app with real traffic (10,669 schools vs. near-zero real News/
  // Events/Jobs content), so it's the page that actually validates whether
  // analytics_events is receiving real rows, not just the fixture-school
  // regression test. Awaited (matching news/events/jobs' pattern) rather
  // than fire-and-forget: logAnalyticsEvent never throws, so this can't
  // fail the page, but an un-awaited insert risks being dropped if the
  // runtime tears the request down right after the response is sent.
  await logAnalyticsEvent({
    eventType: "page_view",
    entityType: "school",
    entityId: school.id,
    schoolId: school.id,
  });

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
    fieldEvidence,
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
    // Identity & Search Presence Foundation v1 (29 Sep 2026) — api.public_field_evidence
    // (db/views/106_public_field_evidence.sql): open-licence per-field source attribution.
    getPublicFieldEvidenceBySchoolId(school.id),
  ]);
  const similarSchools = similarSchoolsRaw.filter((s) => s.id !== school.id).slice(0, 4);

  // High-leverage change #2 (29 Sep 2026) — "What's happening" merges News,
  // Events and Jobs (already fetched above) into one ordered feed instead of
  // three separate sections a parent has to scan past individually. Each
  // domain's own model/provenance/canonical page is unchanged; this is a
  // display-order projection only (see src/lib/school-activity.ts header).
  const activity = buildSchoolActivityFeed(news, events, jobs, now);

  // Identity & Search Presence Foundation v1 (29 Sep 2026) — one row per
  // field for lookup by the School facts/Location sections below. A field can
  // have more than one open-licence source (e.g. UDISE+ and a state
  // department both reporting `address`); keep the most recently recorded
  // one rather than picking arbitrarily.
  const evidenceByField: Record<string, (typeof fieldEvidence)[number]> = {};
  for (const row of fieldEvidence) {
    const existing = evidenceByField[row.field];
    if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
      evidenceByField[row.field] = row;
    }
  }

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
  const applySent = rawSearchParams.apply_sent === "1";
  const applyErrorCode =
    typeof rawSearchParams.apply_error === "string" ? rawSearchParams.apply_error : null;

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
  // Two distinct clocks, deliberately never collapsed into one: verifiedAt
  // (below, rendered as its own badge/FreshnessLine) answers "did SchoolOye
  // actually verify this," and stays null until a real verification event
  // happens — it is never backfilled or reinterpreted. dateModified answers a
  // different question — "did the published page change" — and verifiedAt is
  // only one of several real inputs to it, alongside sourced facts that
  // changed without a formal verification event (fresh UDISE+/SARAS evidence,
  // an admission-cycle update, a new News/Event/Job post actually rendered in
  // the "What's happening" feed below). A page can be freshly modified
  // without every fact on it being freshly verified; JSON-LD must not imply
  // otherwise.
  //
  // News/Events/Jobs (added 29 Sep 2026, second confirmation pass): each
  // uses the timestamp that actually means "this appeared on the page," never
  // a scheduled/future date. News: published_at (already this domain's own
  // "when it went live" field). Jobs: created_at (already used as
  // JobPosting.datePosted on its own canonical page). Events: created_at —
  // NOT starts_at, which is a scheduled date that can be months in the
  // future and would make dateModified nonsensical; school_events already
  // had this column, it just wasn't exposed by api.public_school_events
  // until this same pass (102_public_school_events.sql).
  const dateModified = latestOf(
    verifiedAt,
    ...PAGE_VISIBLE_EVIDENCE_FIELDS.map((field) => evidenceByField[field]?.created_at),
    ...recentAdmissionUpdates.map((u) => u.occurred_at),
    ...news.map((n) => n.published_at),
    ...events.map((e) => e.created_at),
    ...jobs.map((j) => j.created_at),
  );
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

  // Header CTA copy, keyed off the same admissions pillStatus the Decision
  // Strip already computes — never a fourth independent read of the cycle.
  // Deliberately NOT "Alert me when admissions open": there is no
  // subscription/notification pipeline behind SaveButton, only the real
  // shortlist toggle (My Schools). The label says what actually happens —
  // bookmarking the school — while still reflecting admissions urgency in
  // its wording, so it reads as purposeful rather than a generic "Save".
  const admissionsSlot = decisionSlots.find((s) => s.id === "admissions");
  const admissionPillStatus =
    admissionsSlot?.status === "available" ? admissionsSlot.pillStatus : undefined;
  const headerCtaLabelSave =
    admissionPillStatus === "open" || admissionPillStatus === "closing-soon"
      ? "Track this admission cycle"
      : admissionPillStatus === "closed"
        ? "Save for next year's cycle"
        : "Save to track this school";
  const headerCtaLabelSaved = "Tracking ✓ — in My Schools";

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

  // H1 geo-context (SEO review, 2026-09-29): the H1 was the one on-page signal
  // missing city — title, meta description and breadcrumbs already carry it.
  // Same trust bar as the breadcrumb trail above: locality is added only when
  // school.locality_name is actually set (never invented, never shown for a
  // school with only pincode-level geocoding and no real locality match).
  // City comes from `city`, which is null when a school's district doesn't
  // resolve to a launched city area — H1 falls back to the bare name then,
  // same as the breadcrumb trail falling back to [].
  const h1LocationSuffix = city
    ? [school.locality_name, city.cityName].filter(Boolean).join(", ")
    : null;

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
    // No SchoolOye/DB id (D-121 §10); board affiliation no. and UDISE+ code are
    // public official identifiers. Identity & Search Presence Foundation v1
    // (29 Sep 2026) adds udise_code as a second array entry — schema.org's
    // `identifier` accepts one PropertyValue or an array of them, so a school
    // with only one of the two still gets a single value, not a pointless
    // one-element array.
    ...(() => {
      const identifiers = [
        ...(affiliationNo && board
          ? [
              {
                "@type": "PropertyValue",
                propertyID: `${board.board_name} affiliation no.`,
                value: affiliationNo,
              },
            ]
          : []),
        ...(school.udise_code
          ? [{ "@type": "PropertyValue", propertyID: "UDISE+ code", value: school.udise_code }]
          : []),
      ];
      if (identifiers.length === 0) return {};
      return { identifier: identifiers.length === 1 ? identifiers[0] : identifiers };
    })(),
    // Board abbreviation (29 Sep 2026) — board_code ("CBSE") was already real,
    // typed, already-queried data (publicSchoolBoardContract) that nothing on
    // this page used; every mention used the full legal name only. Adding it
    // as `alternateName` here keeps board_name as the one authoritative name
    // (matches the identifier propertyID and Quick Facts text below) while
    // still giving machines the recognized short form — full identity +
    // recognized abbreviation, not replacing the formal name with a shorter one.
    ...(board
      ? {
          memberOf: {
            "@type": "Organization",
            name: board.board_name,
            alternateName: board.board_code,
          },
        }
      : {}),
    // SEO review, 2026-09-29: previously locality-only (school.locality_name ?
    // {...} : {}), so areaServed vanished entirely for the common case of a
    // school with no locality match — same either/or gap as the old H1/title
    // logic above, just in structured data instead of visible text. Falls back
    // to city, same join as h1LocationSuffix/areaLabel; omitted only when
    // neither is known.
    ...(h1LocationSuffix ? { areaServed: { "@type": "Place", name: h1LocationSuffix } } : {}),
    // Structured-data section audit (29 Sep 2026) — grade range is a real,
    // sourced field already rendered under "School facts" but was never
    // promoted to structured data; follows the same SDP-31 rule as everything
    // else here (real value or omitted, never a placeholder). No equally
    // clean first-class schema.org property fits a grade range, so it goes
    // into `additionalProperty` — the documented escape hatch for a real fact
    // that doesn't map to one.
    //
    // Medium of instruction was briefly added here as `inLanguage` and then
    // removed the same day (correction from Prav): `inLanguage` describes the
    // language of a CreativeWork/page's own content — the language SchoolOye
    // renders this page in — not a fact about the school being described.
    // Medium of instruction = English is a real school fact (still shown
    // under "School facts", still eligible for the same evidence/source
    // mechanism as any other field), but it isn't the same claim, and
    // schema.org has no clean property for "language taught in" on a
    // School/EducationalOrganization node. Per the locked principle
    // (structured data is a truthful projection, not a forced mapping of
    // every UI field into schema.org), omission here is correct — do not
    // reintroduce this as inLanguage or any other borrowed property.
    ...(school.max_class
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            name: "Grade range",
            value: grades,
          },
        }
      : {}),
    // Structured-data section audit (29 Sep 2026) — links the School node to its
    // own News/Events/Jobs (the "What's happening" feed above), each of which
    // already carries its own NewsArticle/Event/JobPosting JSON-LD on its own
    // canonical page (news/[slug], events/[slug], jobs/[slug]). Those pages'
    // publisher/organizer/hiringOrganization now reference this node's own @id
    // (schoolNodeId, same edit) rather than a bare name string, so the two
    // sides form one connected graph instead of two nodes that only coincide
    // on text. `subjectOf` is the correct direction here (this School is the
    // subject the other creative works are about), not `mentions`.
    ...(news.length + events.length + jobs.length > 0
      ? {
          subjectOf: [
            ...news.map((n) => ({ "@id": `${siteUrl}${newsPath(locale, n.post_slug)}` })),
            ...events.map((e) => ({ "@id": `${siteUrl}${eventPath(locale, e.event_slug)}` })),
            ...jobs.map((j) => ({ "@id": `${siteUrl}${jobPath(locale, j.job_slug)}` })),
          ],
        }
      : {}),
    url: `${siteUrl}${canonicalPath}`,
    // sameAs asserts entity equivalence — only URLs genuinely established to be
    // the same school's own official record, never "other useful links." The
    // SARAS detail-page URL is safe to construct here: verified this session
    // across ~19 real fetches (Ahmedabad pilot), one deterministic pattern by
    // affiliation number, and SARAS is CBSE-specific so it's gated to that
    // board. UDISE+'s own record page (kys.udiseplus.gov.in) is deliberately
    // NOT added the same way — only one live example was confirmed this
    // session (.../schooldetail1/{udise_code}/11) and the trailing segment's
    // meaning/stability across schools hasn't been verified; constructing a
    // wrong or broken sameAs URL is worse than omitting it. Revisit once that
    // pattern is confirmed across a real sample.
    ...(() => {
      const sameAs = [
        ...(websiteUrl ? [websiteUrl] : []),
        ...(affiliationNo && board?.board_name?.toUpperCase() === "CBSE"
          ? [`https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/${affiliationNo}`]
          : []),
      ];
      if (sameAs.length === 0) return {};
      return { sameAs: sameAs.length === 1 ? sameAs[0] : sameAs };
    })(),
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
    // Identity projection consistency (item 5, 29 Sep 2026): must match
    // schoolMetadata()'s <title> exactly — now the same schoolPageTitle() call
    // on the same schoolAreaLabel() result, not a second inline copy of the
    // title string. (Previously used a locality-else-city local that silently
    // disagreed with the title whenever both locality and city were known —
    // see schoolAreaLabel's header comment. Then, briefly, two separately
    // hand-written copies of the same title string — the exact drift risk
    // this comment already warned about — until this fix.)
    name: schoolPageTitle(name, schoolAreaLabel(school.locality_name, city?.cityName)),
    mainEntity: { "@id": schoolNodeId },
    // Structured-data section audit (29 Sep 2026) — was missing entirely, despite
    // seo-geo.md §4 explicitly requiring it. See latestOf()'s header comment for
    // why this is more than just school.last_verified_at. Omitted, not
    // fabricated from build/request time, when nothing dated is known yet.
    ...(dateModified ? { dateModified: dateModified.toISOString() } : {}),
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
    { id: "whats-happening-heading", label: "What's happening", show: activity.length > 0 },
    { id: "location-heading", label: "Location", show: Boolean(school.address || mapPoint) },
    { id: "teachers-heading", label: "Teachers", show: team.length > 0 },
    { id: "coverage-heading", label: "What SchoolOye knows", show: true },
    // Production Integrity Correction (29 Sep 2026) — "Similar" overclaimed a
    // relationship this list doesn't have: getSimilarSchools() is proximity
    // only (locality, falling back to city), never board/grades/fees/gender —
    // there is no similarity model here at all. Renamed to what it actually
    // is; `id`/nav anchor unchanged (entity-page.section-order.test.ts pins
    // "similar-heading" as the id, not the label).
    { id: "similar-heading", label: "Nearby schools", show: similarSchools.length > 0 },
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

        {/* Trust banner (elevates the existing identityBand from a small text
          line to a full-bleed header band — design school-entity-page-v2's
          C1–C3). Same three states, same copy, no new data: identityBand
          already carries the heading/description this reads, computed from
          schools.claim/verification exactly as before. "verified" gets the
          so-accent treatment (dark-mode aware via the same tokens the V2
          chrome uses); the other two states stay a quiet neutral band rather
          than inventing a second color for "school-claimed" vs "unclaimed" —
          the two-tier badge/FreshnessLine row below already distinguishes
          them in text. */}
        <div
          className={`-mx-4 mb-4 flex flex-col gap-3 border-y px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:-mx-10 md:px-10 ${
            identity.state === "verified"
              ? "border-so-accent/30 bg-so-accent-soft"
              : "border-so-line2 bg-so-surface"
          }`}
        >
          <div className="flex items-start gap-2">
            {identity.state === "verified" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-so-accent"
                style={{ strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" }}
              >
                <path d="M4 1.5h5.5l3 3V14.5H4z M9.5 1.5v3h3 M6.2 9.4l1.5 1.5 2.7-3" />
              </svg>
            )}
            <div className="flex flex-col gap-0.5">
              <span
                className={`text-meta font-semibold ${
                  identity.state === "verified" ? "text-so-accent" : "text-muted-ink"
                }`}
              >
                {identity.heading}
              </span>
              <span className="text-meta text-slate">{identity.description}</span>
            </div>
          </div>
          <SaveButton
            schoolId={school.id}
            saved={shortlistedIdsSet.has(school.id)}
            locale={locale}
            labelSave={headerCtaLabelSave}
            labelSaved={headerCtaLabelSaved}
            span="w-fit shrink-0 px-4"
            variant="primary"
          />
        </div>

        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:gap-4">
          <PhotoPlaceholder className="hidden h-24 w-32 shrink-0 sm:block" label={name} />
        </div>

        <div className="flex flex-col gap-2 border-b border-rule pb-6">
          <h1 className="font-display text-title-m md:text-title-d">
            {name}
            {h1LocationSuffix && <span className="text-muted-ink">, {h1LocationSuffix}</span>}
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
              carries a genuinely distinct, cycle-level signal. Increment 12 —
              the plain "Save" button that used to sit here is removed too:
              it's the same toggleShortlist action now surfaced once, as the
              elevated, state-aware CTA in the trust banner above, rather than
              two separate Save controls for one school on the same page. */}
            <ShareButton title={name} />
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
                {/* UDISE Enrichment (29 Sep 2026) — remove auto-filled principal/type info
                  from about_en display since it's now shown separately in School facts. */}
                <p className="text-body leading-relaxed">
                  {school.about_en
                    ? school.about_en
                        .replace(/Principal:\s*[^|]+\s*\|\s*Type:\s*[^|]+\s*(\|)?/gi, "")
                        .trim()
                    : ""}
                </p>
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
                {/* UDISE Enrichment: Principal/Head Name (29 Sep 2026) — 100% coverage in UDISE data.
                  No per-field badge here (30 Sep 2026) — source/freshness is shown once, in the
                  Data Enrichment section at the bottom of the page, not repeated next to every field. */}
                {(() => {
                  // Extract principal name from principal_name field or from about_en
                  const principalName =
                    school.principal_name ||
                    school.about_en?.match(/Principal:\s*([^|]+)/)?.[1]?.trim();
                  return principalName ? (
                    <div>
                      <dt className="text-meta font-semibold text-muted-ink">Principal</dt>
                      <dd>{principalName}</dd>
                    </div>
                  ) : null;
                })()}
                {/* Increment 7: "Grades" row removed — it rendered the exact same
                  `grades` string already shown in the header and the Decision
                  Strip's Entry classes slot, with no added value (unlike Board,
                  which adds the affiliation number here). "Fee range" row
                  removed too — the Decision Strip and Coverage Card both already
                  say "Not yet verified" for this; a third identical row added
                  nothing. See docs/ops/implementation-log.md Increment 7. */}
                <div>
                  <dt className="text-meta font-semibold text-muted-ink">Established</dt>
                  <dd>
                    {school.established_year ?? <NotYetPublished />}
                    {evidenceByField.established_year && (
                      <SourceLine evidence={evidenceByField.established_year} className="mt-0.5" />
                    )}
                  </dd>
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
                {/* Identity & Search Presence Foundation v1 (29 Sep 2026) — UDISE+
                  code, promoted to a first-class column in this increment
                  (supabase/migrations/20260929100000_school_udise_identity.sql).
                  Board affiliation only covers ~4% of schools; UDISE+ covers most
                  of the corpus, so this is the identifier most schools actually
                  have. Only rendered when present — never "Not yet published"
                  here, since most schools genuinely have no board affiliation on
                  file yet and that's the honest state, but a missing UDISE code
                  isn't a comparable "gap to flag" the same way. */}
                {school.udise_code && (
                  <div>
                    <dt className="text-meta font-semibold text-muted-ink">UDISE+ code</dt>
                    <dd>{school.udise_code}</dd>
                  </div>
                )}
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
                          {/* 29 Sep 2026 (Activity & Admissions Consolidation, P0.2):
                            this is a lead/enquiry capture, not an application, so the
                            CTA no longer says "Apply" — it says what it actually does.
                            The school's own form is the one place an application can
                            actually be submitted, so it's labelled as such and kept as
                            a fully visible, equally-weighted option (never removed —
                            some schools have no other process). Clicking through to it
                            logs "admission_external_click" (see actions.ts). */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <a
                              href="#apply-heading"
                              className="font-semibold text-ruled-blue text-meta"
                            >
                              Request admission information →
                            </a>
                            {cycle.form_url && (
                              <TrackedApplyLink
                                href={cycle.form_url}
                                cycleId={cycle.cycle_id}
                                schoolId={school.id}
                                className="text-meta text-muted-ink underline"
                              >
                                Apply on school&rsquo;s official website ↗
                              </TrackedApplyLink>
                            )}
                          </div>
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

            {/* High-leverage change #2 (29 Sep 2026) — "What's happening" replaces
              the three separate News/Events/Jobs sections (Increment 10R had
              already moved News up next to Admissions for exactly this reason,
              C19) with one merged, ordered feed — src/lib/school-activity.ts.
              Each item still links to its own domain's canonical page and
              carries only real fields already on its row (see ActivityFeedItem
              above); this only changes how the three lists are grouped and
              ordered for display. Site-wide /events, /news and /jobs hub routes
              now exist (built this session), so the "Events stays out of scope"
              note this comment used to carry no longer applies. Still renders
              nothing when empty — no placeholder box. */}
            {activity.length > 0 && (
              <section aria-labelledby="whats-happening-heading" className="flex flex-col gap-3">
                <h2 id="whats-happening-heading" className="font-display text-card font-semibold">
                  What&rsquo;s happening
                </h2>
                <div className="flex flex-col gap-3">
                  {activity.map((item) => (
                    <ActivityFeedItem
                      key={`${item.kind}-${item.data.id}`}
                      item={item}
                      locale={locale}
                    />
                  ))}
                </div>
              </section>
            )}

            {(school.address || mapPoint) && (
              <section aria-labelledby="location-heading" className="flex flex-col gap-3">
                <h2 id="location-heading" className="font-display text-card font-semibold">
                  {t(dict, "school_page.location_heading")}
                </h2>
                {/* UDISE Enrichment: Structured Address Display (29 Sep 2026) */}
                <div className="space-y-3">
                  {school.address && (
                    <div className="flex flex-col gap-2">
                      <div className="text-body">
                        <div className="font-semibold text-ink">{school.address}</div>
                        {school.address_pincode && (
                          <div className="text-meta text-muted-ink">
                            Pin: {school.address_pincode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!school.address && (
                    <p className="text-body">{t(dict, "common.address_not_yet_published")}</p>
                  )}
                  {evidenceByField.address && <SourceLine evidence={evidenceByField.address} />}

                  {/* Structured Address Components — display when available */}
                  {(school.address_street ||
                    school.address_area ||
                    school.address_city ||
                    school.address_district ||
                    school.address_state ||
                    school.address_pincode) && (
                    <div className="rounded-md bg-so-surface p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-meta font-semibold text-muted-ink">
                          Address details
                        </span>
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-body text-sm">
                        {school.address_street && (
                          <>
                            <dt className="font-semibold text-muted-ink">Street</dt>
                            <dd className="truncate" title={school.address_street}>
                              {school.address_street}
                            </dd>
                          </>
                        )}
                        {school.address_area && (
                          <>
                            <dt className="font-semibold text-muted-ink">Area</dt>
                            <dd>{school.address_area}</dd>
                          </>
                        )}
                        {school.address_city && (
                          <>
                            <dt className="font-semibold text-muted-ink">City</dt>
                            <dd>{school.address_city}</dd>
                          </>
                        )}
                        {school.address_district && (
                          <>
                            <dt className="font-semibold text-muted-ink">District</dt>
                            <dd>{school.address_district}</dd>
                          </>
                        )}
                        {school.address_state && (
                          <>
                            <dt className="font-semibold text-muted-ink">State</dt>
                            <dd>{school.address_state}</dd>
                          </>
                        )}
                        {(school.address_pincode || school.pincode) && (
                          <>
                            <dt className="font-semibold text-muted-ink">Pincode</dt>
                            <dd>{school.address_pincode || school.pincode}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  )}
                </div>

                {mapPoint && (
                  <span className="text-meta text-muted-ink">
                    {t(dict, "school_page.location_precision_note", {
                      precision: school.geocode_precision ?? "pincode",
                    })}
                  </span>
                )}

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
              Teachers) and before Nearby schools/discovery, per the locked
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
                  Nearby schools
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

            {/* 29 Sep 2026: the admissions-lead-capture CTA. Distinct from "Ask this
              school" below on purpose — applying is a deliberate, single-recipient
              disclosure (the parent is choosing to give *this* school their contact
              details so it can process an application, same as a paper form), not the
              SDP-04 controlled-intermediary model that keeps contact details private
              for a general question. See submitAdmissionLead in ./actions.ts and
              admission_leads (20260929070000_admission_leads.sql). */}
            {admissions.length > 0 && (
              <section
                aria-labelledby="apply-heading"
                className="flex flex-col gap-2 rounded-md border border-rule p-4"
              >
                <h2 id="apply-heading" className="font-display text-card font-semibold">
                  Request admission information
                </h2>
                {applySent ? (
                  <p className="text-body text-muted-ink">
                    Your request has been sent to {name}. They have your name and phone number and
                    will reach out directly.
                  </p>
                ) : applyErrorCode === "already_applied" ? (
                  <p className="text-body text-muted-ink">
                    You've already sent a request for this class — {name} has your details.
                  </p>
                ) : user ? (
                  <form action={submitAdmissionLead} className="flex flex-col gap-3">
                    <input type="hidden" name="schoolId" value={school.id} />
                    <input type="hidden" name="returnPath" value={canonicalPath} />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-meta font-semibold text-muted-ink">
                        Class and session
                      </span>
                      <select
                        name="cycleSelection"
                        required
                        defaultValue=""
                        className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
                      >
                        <option value="" disabled>
                          Choose a class
                        </option>
                        {admissions.map((cycle) => (
                          <option
                            key={cycle.cycle_id}
                            value={`${cycle.cycle_id}|${cycle.class_code}|${cycle.academic_year}`}
                          >
                            {cycle.academic_year} · Class {cycle.class_code.replace(/^c/, "")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-meta font-semibold text-muted-ink">
                        Note for the school (optional)
                      </span>
                      <textarea
                        name="note"
                        maxLength={1000}
                        rows={3}
                        className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
                      />
                    </label>
                    <label className="flex items-start gap-2 text-meta text-muted-ink">
                      <input type="checkbox" name="consent" required className="mt-0.5" />
                      <span>
                        Share my name and phone number with {name} so they can respond to my
                        request.
                      </span>
                    </label>
                    {applyErrorCode && applyErrorCode !== "already_applied" && (
                      <FieldError id="apply-error">
                        {applyErrorCode === "consent_required"
                          ? "Check the consent box to share your details with the school."
                          : "Something went wrong sending your request. Please try again."}
                      </FieldError>
                    )}
                    <button
                      type="submit"
                      className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
                    >
                      Request admission information →
                    </button>
                  </form>
                ) : (
                  <Link
                    href={lp(
                      locale,
                      `/sign-in?next=${encodeURIComponent(`${canonicalPath}#apply-heading`)}`,
                    )}
                    className="w-fit font-semibold text-ruled-blue"
                  >
                    Sign in to request information
                  </Link>
                )}
              </section>
            )}

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

        {/* Enrichment metadata (source/freshness/per-field confidence scores)
          is deliberately NOT shown on this public page (removed 30 Sep 2026)
          — it's data-pipeline observability info (e.g. "UDISE", per-field
          confidence percentages) that means nothing to a parent deciding
          about a school, and it duplicates/undercuts the simpler trust
          language this page already uses (Verified/Not yet verified, the
          footer disclaimer below, SourceLine on admissions). It's surfaced
          instead on the ops school detail page, where "UDISE" and a quality
          score are actually actionable. See src/app/ops/schools/[id]. */}

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
