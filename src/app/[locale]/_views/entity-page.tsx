import type { Metadata } from "next";
import Link from "next/link";

import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { StatusPill } from "@/components/ui/badges";
import { DeadlineMargin } from "@/components/ui/deadline-margin";
import { FieldError } from "@/components/ui/field-error";
import { FreshnessLine, NotYetPublished } from "@/components/ui/freshness-line";
import { SaveButton } from "@/components/ui/save-button";
import { SchoolCard } from "@/components/ui/school-card";
import { ShareButton } from "@/components/ui/share-button";
import { EmptyState } from "@/components/ui/state-message";
import type { PublicSchoolAdmission } from "@/contracts";
import { getDictionary } from "@/i18n/dictionary";
import { t, tEnum } from "@/i18n/t";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getPublicAdmissionsBySchoolId,
  type getPublicLocalityBySlug,
  listLocalityNeighbors,
  listPublicSchoolsByLocality,
} from "@/lib/db/public-adapter";
import { listPublicSchoolTeam } from "@/lib/db/school-team";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { getShortlistedSchoolIds } from "@/lib/db/shortlist";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { siteUrl } from "@/lib/env.server";
import { formatCurrency } from "@/lib/format";
import { formatGradeRange } from "@/lib/grades";
import { localeCanonical } from "@/lib/seo";
import {
  cityPath,
  localityPath as localityHref,
  lp,
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

export function schoolMetadata(locale: string, resolved: ResolvedSchool): Metadata {
  const { bundle, city } = resolved;
  const { school } = bundle;
  const name = school.name_en ?? "School";
  const areaLabel = school.locality_name ?? city?.cityName ?? "India";
  return {
    title: `${name}, ${areaLabel} — SchoolOye`,
    description: `${name}: board, grades, fees and admission dates in ${areaLabel}.`,
    alternates: { canonical: localeCanonical(locale, schoolPath("en", school.slug)) },
  };
}

function schoolOrgType(maxClass: string | null): string {
  const maxNum = maxClass ? Number(maxClass.replace(/^c/, "")) : null;
  if (maxNum != null && maxNum <= 5) return "ElementarySchool";
  if (maxNum != null && maxNum >= 9) return "HighSchool";
  return "School";
}

/**
 * Header record badge — D7 / D-052 (docs/guidelines/content-and-trust.md §3).
 * Exactly two states: a school-verified page says "Official record"; every
 * other page (unclaimed, or claimed but not yet confirmed by the school)
 * says "Compiled by SchoolOye from public records". Never "Official" or a
 * logo outside the first state, and never a fabricated date.
 */
function recordBadge(
  verification: string,
  verifiedAt: Date | null,
): { label: string; official: boolean } {
  const dateStr = verifiedAt
    ? verifiedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  if (verification === "school_verified") {
    return {
      label: `Official record${dateStr ? ` · verified by school on ${dateStr}` : ""}`,
      official: true,
    };
  }
  return {
    label: `Compiled by SchoolOye from public records${dateStr ? ` · ${dateStr}` : ""}`,
    official: false,
  };
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

  const [admissions, shortlistedIdsSet, similarSchoolsRaw, team] = await Promise.all([
    getPublicAdmissionsBySchoolId(school.id),
    getShortlistedSchoolIds([school.id]),
    school.locality_id ? listPublicSchoolsByLocality(school.locality_id) : Promise.resolve([]),
    listPublicSchoolTeam(school.id),
  ]);
  const similarSchools = similarSchoolsRaw.filter((s) => s.id !== school.id).slice(0, 4);

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

  const primaryAdmission: PublicSchoolAdmission | undefined = admissions[0];
  const deadlineInput = {
    opensAt: primaryAdmission?.opens_on ? new Date(primaryAdmission.opens_on) : null,
    closesAt: primaryAdmission?.closes_on ? new Date(primaryAdmission.closes_on) : null,
  };
  const pill = deadlineToPill(deadlineState(deadlineInput, now));

  const verifiedAt = school.last_verified_at ? new Date(school.last_verified_at) : null;
  const badge = recordBadge(school.verification, verifiedAt);

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

  const orgType = schoolOrgType(school.max_class);
  const schoolJsonLd = {
    "@context": "https://schema.org",
    "@type": orgType,
    "@id": `${siteUrl}${canonicalPath}`,
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
    ...(school.phone?.[0] ? { telephone: school.phone[0] } : {}),
    ...(school.email?.[0] ? { email: school.email[0] } : {}),
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
    ...(school.website ? { sameAs: school.website } : {}),
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

  // FAQPage: only real, answerable facts — never a templated filler repeated
  // identically across every school. Admissions is included either way
  // (honestly saying dates aren't announced yet is still a real answer);
  // skip the whole block below 3 entries rather than pad it out.
  const faqCandidates: { question: string; answer: string }[] = [];
  if (board?.board_name) {
    faqCandidates.push({
      question: `What board is ${name} affiliated with?`,
      answer: `${name} is affiliated with ${board.board_name}${affiliationNo ? ` (affiliation no. ${affiliationNo})` : ""}.`,
    });
  }
  if (grades !== "Not yet published") {
    faqCandidates.push({
      question: `What classes does ${name} teach?`,
      answer: `${name} teaches ${grades}.`,
    });
  }
  if (school.address || school.locality_name) {
    faqCandidates.push({
      question: `Where is ${name} located?`,
      answer: `${name} is located${school.locality_name ? ` in ${school.locality_name},` : ""} ${city?.cityName ?? ""}${school.address ? ` (${school.address})` : ""}.`,
    });
  }
  if (primaryAdmission?.closes_on) {
    faqCandidates.push({
      question: `When do admissions close at ${name}?`,
      answer: `Admissions for ${primaryAdmission.academic_year}, class ${primaryAdmission.class_code.replace(/^c/, "")} close on ${new Date(primaryAdmission.closes_on).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
    });
  } else {
    faqCandidates.push({
      question: `Is admission open at ${name} right now?`,
      answer: `${name} hasn't announced its next admission dates yet — check back, or set an alert for when the form opens.`,
    });
  }
  const faqJsonLd =
    faqCandidates.length >= 3
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqCandidates.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-6 md:px-10 md:py-9">
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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

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
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <StatusPill status={pill.status}>{pill.label}</StatusPill>
          <span
            className={`text-meta font-semibold ${badge.official ? "text-board-green" : "text-muted-ink"}`}
          >
            {badge.official ? "✓ " : ""}
            {badge.label}
          </span>
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
          {school.claim !== "claimed" && (
            <Link
              href={`/for-schools/claim/${school.id}`}
              className="font-semibold text-ruled-blue"
            >
              Is this your school? Claim it free
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 py-6 md:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          {school.about_en && (
            <section aria-labelledby="about-heading" className="flex flex-col gap-2">
              <h2 id="about-heading" className="font-display text-card font-semibold">
                About {name}
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
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Grades</dt>
                <dd>{grades}</dd>
              </div>
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Established</dt>
                <dd>{school.established_year ?? <NotYetPublished />}</dd>
              </div>
              <div>
                <dt className="text-meta font-semibold text-muted-ink">Fee range</dt>
                <dd>
                  <NotYetPublished />
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
            </dl>
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
          </section>

          <section aria-labelledby="admissions-heading" className="flex flex-col gap-3">
            <h2 id="admissions-heading" className="font-display text-card font-semibold">
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
                      <DeadlineMargin {...cycleDeadline} now={now} className="h-20 w-32 shrink-0" />
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
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body text-muted-ink">Dates not announced</p>
            )}
          </section>

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

        <aside className="flex flex-col gap-4">
          <section
            aria-labelledby="contact-heading"
            className="flex flex-col gap-2 rounded-md border border-rule p-4"
          >
            <h2 id="contact-heading" className="font-display text-card font-semibold">
              Contact
            </h2>
            <div className="flex flex-col gap-1.5 text-body">
              <div>
                <span className="text-meta font-semibold text-muted-ink">Phone: </span>
                {school.phone && school.phone.length > 0 ? (
                  school.phone.join(", ")
                ) : (
                  <NotYetPublished />
                )}
              </div>
              <div>
                <span className="text-meta font-semibold text-muted-ink">Email: </span>
                {school.email && school.email.length > 0 ? (
                  school.email.join(", ")
                ) : (
                  <NotYetPublished />
                )}
              </div>
              <div>
                <span className="text-meta font-semibold text-muted-ink">Website: </span>
                {school.website ? (
                  <a
                    href={school.website}
                    className="font-semibold text-ruled-blue"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {school.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <NotYetPublished />
                )}
              </div>
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
    </div>
  );
}
