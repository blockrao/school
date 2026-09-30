import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { SponsoredWhyDisclosure, StatusPill } from "@/components/ui/badges";
import { CompareTray } from "@/components/ui/compare-tray";
import { NotYetPublished } from "@/components/ui/freshness-line";
import { SaveButton } from "@/components/ui/save-button";
import { SchoolCard } from "@/components/ui/school-card";
import { EmptyState } from "@/components/ui/state-message";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardCategoryLinksForDistrict,
  getBoardNamesBySchoolId,
  getPublicCityAreaBySlug,
  getPublicStateAreaBySlug,
  getPublicTownAreaBySlug,
  listActiveFeaturedPlacementsByCity,
  listDistrictFilterOptions,
  listLocalityNeighbors,
  listPublicLocalitiesByCity,
  listPublicSchoolsByDistrict,
  listPublicSchoolsByLocality,
} from "@/lib/db/public-adapter";
import { getShortlistedSchoolIds } from "@/lib/db/shortlist";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { siteUrl } from "@/lib/env.server";
import { formatGradeRange } from "@/lib/grades";
import { localeCanonical } from "@/lib/seo";
import {
  cityPath,
  homePath,
  localePrefix,
  localityPath,
  schoolPath,
  schoolsRootPath,
  statePath,
} from "@/lib/urls";

const PAGE_SIZE = 24;

function parseFilters(searchParams: { [key: string]: string | string[] | undefined }) {
  const boardParam = Array.isArray(searchParams.board) ? searchParams.board[0] : searchParams.board;
  const gradeParam = Array.isArray(searchParams.grade) ? searchParams.grade[0] : searchParams.grade;
  const admissionsParam = Array.isArray(searchParams.admissions)
    ? searchParams.admissions[0]
    : searchParams.admissions;
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;

  const compareParam = Array.isArray(searchParams.compare)
    ? searchParams.compare[0]
    : searchParams.compare;

  const boardId = boardParam ? Number(boardParam) : undefined;
  const maxClass = gradeParam || undefined;
  const admissionsOpen = admissionsParam === "open";
  const page = pageParam ? Math.max(1, Number(pageParam) || 1) : 1;
  const compareIds = (compareParam || "").split(",").filter(Boolean);

  return { boardId, maxClass, admissionsOpen, page, compareIds };
}

/** Matches schools/page.tsx's own compare tray — same URL-param pattern, same limit. */
const COMPARE_LIMIT = 4;

/**
 * Resolves the `[city]` segment four ways, in order: a real city, a town
 * (peer-level in the URL, e.g. /chomu), a state canonical page (e.g. /haryana
 * — docs/seo-canonical-pages-spec.md; added 2026-09-28 by extending this same
 * resolver rather than a sibling route, since Next 16 doesn't allow a second,
 * differently-named dynamic segment at this directory level — see that doc's
 * routing notes), or a legacy district slug to redirect from. District never
 * reaches the UI — it's only used inside
 * getPublicCityAreaBySlug/getRedirectCitySlugForDistrictSlug to resolve old
 * links.
 */
export async function resolvePlace(citySlug: string) {
  const city = await getPublicCityAreaBySlug(citySlug);
  if (city) return { kind: "city" as const, city };

  const town = await getPublicTownAreaBySlug(citySlug);
  if (town) return { kind: "town" as const, town };

  const state = await getPublicStateAreaBySlug(citySlug);
  if (state) return { kind: "state" as const, state };

  return null;
}

export type ResolvedPlace = NonNullable<Awaited<ReturnType<typeof resolvePlace>>>;
type RawSearchParams = { [key: string]: string | string[] | undefined };

/** Metadata for a discovery page (D-121 §7): filters noindex; pagination self-canonical. */
export function placeMetadata(
  locale: string,
  resolved: ResolvedPlace,
  rawSearchParams: RawSearchParams,
): Metadata {
  if (resolved.kind === "town") {
    const { town } = resolved;
    return {
      title: `Schools near ${town.townName}, ${town.stateName} — SchoolOye`,
      description: `Schools near ${town.townName}: fees, facilities and admission dates.`,
      alternates: {
        canonical: localeCanonical(
          locale,
          localityPath("en", town.stateSlug, town.citySlug, town.townSlug),
        ),
      },
    };
  }

  if (resolved.kind === "state") {
    const { state } = resolved;
    return {
      title: `Schools in ${state.stateName} — SchoolOye`,
      description: `${state.totalSchoolCount} schools across ${state.cities.length} ${state.cities.length === 1 ? "city" : "cities"} in ${state.stateName}: browse by city, fees, facilities and admission dates.`,
      alternates: { canonical: localeCanonical(locale, statePath("en", state.stateSlug)) },
    };
  }

  const { city } = resolved;
  const { boardId, maxClass, admissionsOpen, page } = parseFilters(rawSearchParams);
  const filtersActive = boardId !== undefined || maxClass !== undefined || admissionsOpen;
  const path = cityPath("en", city.stateSlug, city.citySlug);

  return {
    title: `${city.cityName} schools${page > 1 ? ` — page ${page}` : ""} — SchoolOye`,
    description: `Browse schools in ${city.cityName}, ${city.stateName}: fees, facilities and admission dates.`,
    alternates: {
      canonical: localeCanonical(
        locale,
        !filtersActive && page > 1 ? `${path}?page=${page}` : path,
      ),
    },
    robots: filtersActive ? { index: false, follow: true } : undefined,
  };
}

function TownPageBody({
  locale,
  town,
  schools,
  neighbors,
  boardNames,
  admissionDeadlines,
  shortlistedIds,
  now,
}: {
  locale: string;
  town: NonNullable<Awaited<ReturnType<typeof getPublicTownAreaBySlug>>>;
  schools: Awaited<ReturnType<typeof listPublicSchoolsByLocality>>;
  neighbors: Awaited<ReturnType<typeof listLocalityNeighbors>>;
  boardNames: Map<string, string>;
  admissionDeadlines: Map<string, string | null>;
  shortlistedIds: Set<string>;
  now: Date;
}) {
  const townPath = localityPath(locale, town.stateSlug, town.citySlug, town.townSlug);

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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: town.stateName,
        item: `${siteUrl}${statePath(locale, town.stateSlug)}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `Near ${town.townName}`,
        item: `${siteUrl}${townPath}`,
      },
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
        <span>{town.stateName}</span>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">Near {town.townName}</span>
      </nav>

      <h1 className="font-display text-title-m md:text-title-d">Schools near {town.townName}</h1>
      <p className="mt-1 text-body text-muted-ink">
        {town.schoolCount} school{town.schoolCount === 1 ? "" : "s"}
      </p>

      {mapPoints.length > 0 && (
        <div className="mt-5">
          <AreaMapLazy
            points={mapPoints}
            centerLat={mapPoints[0].lat}
            centerLng={mapPoints[0].lng}
            zoom={11}
          />
          <p className="mt-1.5 text-meta text-muted-ink">
            Approximate areas, not exact addresses — schools here are geocoded to pincode precision.
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
            nextStepLabel="Browse all schools"
            nextStepHref={schoolsRootPath(locale)}
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
                href={localityPath(locale, town.stateSlug, town.citySlug, neighbor.slug)}
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

/**
 * State canonical page (docs/seo-canonical-pages-spec.md): H1 "Schools in
 * {State}", total count, and every launched city in the state as a card
 * linking down to its city page — the state page's main internal-linking job.
 * No filters, no school grid here — this page is a directory of cities, not
 * of schools; a parent clicks through to a city to see actual schools.
 */
function StatePageBody({
  locale,
  state,
}: {
  locale: string;
  state: NonNullable<Awaited<ReturnType<typeof getPublicStateAreaBySlug>>>;
}) {
  const stateHref = statePath(locale, state.stateSlug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}${homePath(locale)}` },
      { "@type": "ListItem", position: 2, name: state.stateName, item: `${siteUrl}${stateHref}` },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Schools in ${state.stateName}`,
    about: state.stateName,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: state.cities.map((city, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: city.name,
        item: `${siteUrl}${cityPath(locale, state.stateSlug, city.slug)}`,
      })),
    },
  };

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
        <Link href={homePath(locale)}>Home</Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{state.stateName}</span>
      </nav>

      <h1 className="font-display text-title-m md:text-title-d">Schools in {state.stateName}</h1>
      <p className="mt-1 text-body text-muted-ink">
        {state.totalSchoolCount} school{state.totalSchoolCount === 1 ? "" : "s"} across{" "}
        {state.cities.length} {state.cities.length === 1 ? "city" : "cities"}
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {state.cities.map((city) => (
          <Link
            key={city.slug}
            href={cityPath(locale, state.stateSlug, city.slug)}
            className="flex flex-col gap-1 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
          >
            <span className="font-display text-card font-semibold text-ink">{city.name}</span>
            <span className="text-body text-muted-ink">
              {city.schoolCount} school{city.schoolCount === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Renders a resolved discovery place (state, city or town). Routes validate the URL first. */
export async function PlaceView({
  locale,
  resolved,
  rawSearchParams,
}: {
  locale: string;
  resolved: ResolvedPlace;
  rawSearchParams: RawSearchParams;
}) {
  const now = new Date();

  if (resolved.kind === "state") {
    return <StatePageBody locale={locale} state={resolved.state} />;
  }

  if (resolved.kind === "town") {
    const { town } = resolved;

    const [schools, neighbors] = await Promise.all([
      listPublicSchoolsByLocality(town.localityId),
      listLocalityNeighbors(town.townSlug),
    ]);
    const schoolIds = schools.map((s) => s.id);
    const [boardNames, admissionDeadlines, shortlistedIds] = await Promise.all([
      getBoardNamesBySchoolId(schoolIds),
      getAdmissionDeadlinesBySchoolId(schoolIds),
      getShortlistedSchoolIds(schoolIds),
    ]);

    return (
      <TownPageBody
        locale={locale}
        town={town}
        schools={schools}
        neighbors={neighbors}
        boardNames={boardNames}
        admissionDeadlines={admissionDeadlines}
        shortlistedIds={shortlistedIds}
        now={now}
      />
    );
  }

  const { city } = resolved;

  const { boardId, maxClass, admissionsOpen, page, compareIds } = parseFilters(rawSearchParams);
  const filtersActive = boardId !== undefined || maxClass !== undefined || admissionsOpen;

  // district-scoped, not city_id-scoped: schools pending /ops locality
  // assignment still belong on the city's "all schools" listing.
  const [{ schools, total }, filterOptions, localities, categoryLinks, featuredPlacements] =
    await Promise.all([
      listPublicSchoolsByDistrict(city.districtIds, {
        boardId,
        maxClass,
        admissionsOpen,
        page,
        pageSize: PAGE_SIZE,
      }),
      listDistrictFilterOptions(city.districtIds),
      listPublicLocalitiesByCity(city.citySlug),
      getBoardCategoryLinksForDistrict(city.districtIds),
      // Provision only — featured_placements has zero rows today (no sponsored
      // inventory yet, ships ahead of selling any). An empty result here must
      // render exactly like it does now: no sponsored cards, no reordering.
      listActiveFeaturedPlacementsByCity(city.citySlug, { classCode: maxClass }),
    ]);
  const sponsoredSchoolIds = new Set(featuredPlacements.map((p) => p.school_id));

  const schoolIds = schools.map((s) => s.id);
  const [boardNames, admissionDeadlines, shortlistedIds] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
    getShortlistedSchoolIds(schoolIds),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const basePath = cityPath(locale, city.stateSlug, city.citySlug);

  function buildHref(
    overrides: Partial<{
      board: string;
      grade: string;
      admissions: string;
      compare: string;
      page: string;
    }>,
  ) {
    const merged = {
      board: boardId !== undefined ? String(boardId) : "",
      grade: maxClass ?? "",
      admissions: admissionsOpen ? "open" : "",
      compare: compareIds.join(","),
      page: "",
      ...overrides,
    };
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) qs.set(key, value);
    }
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  function pageHref(targetPage: number) {
    return buildHref({ page: targetPage > 1 ? String(targetPage) : "" });
  }

  function compareToggleHref(schoolId: string): string | null {
    const inCompare = compareIds.includes(schoolId);
    if (!inCompare && compareIds.length >= COMPARE_LIMIT) return null;
    const next = inCompare ? compareIds.filter((id) => id !== schoolId) : [...compareIds, schoolId];
    return buildHref({ compare: next.join(",") });
  }

  const alertsHref = `${localePrefix(locale)}/alerts${maxClass ? `?class=${maxClass}` : ""}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    // A city-state (Delhi) is its own top level: no separate state crumb (D-126).
    itemListElement: city.isCityState
      ? [{ "@type": "ListItem", position: 1, name: city.cityName, item: `${siteUrl}${basePath}` }]
      : [
          {
            "@type": "ListItem",
            position: 1,
            name: city.stateName,
            item: `${siteUrl}${statePath(locale, city.stateSlug)}`,
          },
          { "@type": "ListItem", position: 2, name: city.cityName, item: `${siteUrl}${basePath}` },
        ],
  };

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 pb-24 md:px-10 md:py-9 md:pb-9">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {!city.isCityState && (
        <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
          <Link href={statePath(locale, city.stateSlug)}>{city.stateName}</Link>
          <span className="mx-1.5" aria-hidden="true">
            /
          </span>
          <span className="text-ink">{city.cityName}</span>
        </nav>
      )}

      <h1 className="font-display text-title-m md:text-title-d">{city.cityName} schools</h1>
      <p className="mt-1 text-body text-muted-ink">
        {total} school{total === 1 ? "" : "s"}
        {filtersActive ? " matching your filters" : ""}
      </p>

      {localities.length > 0 && (
        <div className="mt-5">
          <h2 className="text-meta font-semibold text-muted-ink">Browse by area</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {localities.map((locality) => (
              <Link
                key={locality.slug}
                href={localityPath(locale, city.stateSlug, city.citySlug, locality.slug)}
                className="flex min-h-9 items-center gap-1.5 rounded-md border border-rule bg-copy-white px-3 text-body font-medium hover:border-ruled-blue"
              >
                {locality.isTown ? `Near ${locality.name}` : locality.name}
                <span className="text-meta text-muted-ink">({locality.schoolCount})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {categoryLinks.length > 0 && (
        <div className="mt-5">
          <h2 className="text-meta font-semibold text-muted-ink">Browse by category</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryLinks.map(({ board, count }) => (
              <Link
                key={board.id}
                href={`${basePath}?board=${board.id}`}
                className="flex min-h-9 items-center gap-1.5 rounded-md border border-rule bg-copy-white px-3 text-body font-medium hover:border-ruled-blue"
              >
                {board.name_en} schools
                <span className="text-meta text-muted-ink">({count})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 rounded-md border border-rule bg-copy-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body">
          <span className="font-semibold">Get alerts for this search.</span> We'll message you on
          WhatsApp when a school here publishes admission dates or a deadline is coming up
          {maxClass ? ` for ${formatGradeRange(null, maxClass)}` : ""}.
        </p>
        <Link
          href={alertsHref}
          className="flex h-11 shrink-0 items-center justify-center rounded-md border border-ink px-4 font-semibold"
        >
          Get alerts
        </Link>
      </div>

      <Form action={basePath} className="mt-5 flex flex-wrap items-end gap-3">
        {compareIds.length > 0 && (
          <input type="hidden" name="compare" value={compareIds.join(",")} />
        )}
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Board</span>
          <select
            name="board"
            defaultValue={boardId ?? ""}
            className="h-11 min-w-36 rounded-md border border-line-blue bg-copy-white px-2.5 text-body"
          >
            <option value="">Any board</option>
            {filterOptions.boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name_en}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Grades</span>
          <select
            name="grade"
            defaultValue={maxClass ?? ""}
            className="h-11 min-w-36 rounded-md border border-line-blue bg-copy-white px-2.5 text-body"
          >
            <option value="">Any grades</option>
            {filterOptions.maxClasses.map((code) => (
              <option key={code} value={code}>
                {formatGradeRange(null, code)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex h-11 items-center gap-2">
          <input
            type="checkbox"
            name="admissions"
            value="open"
            defaultChecked={admissionsOpen}
            className="h-5 w-5 rounded-sm border-line-blue"
          />
          <span className="text-body">Admissions open now</span>
        </label>

        <button
          type="submit"
          className="flex h-11 items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Apply filters
        </button>
        {filtersActive && (
          <Link href={basePath} className="flex h-11 items-center font-semibold text-ruled-blue">
            Clear filters
          </Link>
        )}
      </Form>

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

              const inCompare = compareIds.includes(school.id);
              const toggleHref = compareToggleHref(school.id);

              return (
                <SchoolCard
                  key={school.id}
                  href={schoolPath(locale, school.slug)}
                  name={school.name_en ?? "Name not yet published"}
                  meta={meta}
                  sponsored={sponsoredSchoolIds.has(school.id)}
                  sponsoredNote={<SponsoredWhyDisclosure />}
                  now={now}
                  deadline={deadline}
                  status={<StatusPill status={pill.status}>{pill.label}</StatusPill>}
                  fee="Not yet published"
                  freshness={<NotYetPublished />}
                  actions={
                    <>
                      <SaveButton
                        schoolId={school.id}
                        saved={shortlistedIds.has(school.id)}
                        locale={locale}
                        span="col-span-1"
                      />
                      {toggleHref ? (
                        <Link
                          href={toggleHref}
                          role="checkbox"
                          aria-checked={inCompare}
                          className={`flex h-11 items-center justify-center gap-2 rounded-md border font-semibold ${
                            inCompare
                              ? "border-ruled-blue bg-pill-results-bg text-ruled-blue"
                              : "border-line-blue text-ink"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-4.5 w-4.5 items-center justify-center rounded-xs border-2 border-ruled-blue text-copy-white ${
                              inCompare ? "bg-ruled-blue" : "bg-copy-white"
                            }`}
                          >
                            {inCompare && "✓"}
                          </span>
                          {inCompare ? "Remove" : "Compare"}
                        </Link>
                      ) : (
                        <span className="flex h-11 items-center justify-center text-meta text-muted-ink">
                          Limit (4)
                        </span>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={
              filtersActive ? "No schools match these filters" : "No published schools here yet"
            }
            description={
              filtersActive
                ? "Try widening your filters, or browse every school in this city."
                : "Schools appear here once they're verified and published."
            }
            nextStepLabel="Clear filters"
            nextStepHref={basePath}
          />
        )}
      </div>

      {total > PAGE_SIZE && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-semibold text-ruled-blue">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-body text-muted-ink">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="font-semibold text-ruled-blue">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {compareIds.length >= 2 && (
        <div className="fixed inset-x-0 bottom-16 z-40 p-3 md:bottom-3 md:left-1/2 md:right-auto md:w-fit md:-translate-x-1/2">
          <CompareTray
            selectedCount={compareIds.length}
            totalCount={COMPARE_LIMIT}
            clearHref={buildHref({ compare: "" })}
            compareHref={`${localePrefix(locale)}/compare?ids=${compareIds.join(",")}`}
          />
        </div>
      )}
    </div>
  );
}
