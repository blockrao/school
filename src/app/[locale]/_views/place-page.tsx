import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { CardSaveButton, ListingViewerProvider } from "@/components/school/listing-save";
import { AreaMapLazy } from "@/components/ui/area-map-lazy";
import { SponsoredWhyDisclosure, StatusPill } from "@/components/ui/badges";
import { SchoolCard } from "@/components/ui/school-card";
import { EmptyState } from "@/components/ui/state-message";
import { BOARD_HUB_MIN_SCHOOLS, boardHubSlug, boardShortName } from "@/lib/board-slug";
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
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { siteUrl } from "@/lib/env.server";
import { formatGradeRange } from "@/lib/grades";
import { paginationWindow } from "@/lib/pagination";
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
import { CityHighlights } from "./city-highlights";
import { CityHubLayout } from "./city-hub-layout";

const PAGE_SIZE = 24;
const HUB_PREVIEW_SIZE = 6;

function parseFilters(searchParams: { [key: string]: string | string[] | undefined }) {
  const boardParam = Array.isArray(searchParams.board) ? searchParams.board[0] : searchParams.board;
  const gradeParam = Array.isArray(searchParams.grade) ? searchParams.grade[0] : searchParams.grade;
  const admissionsParam = Array.isArray(searchParams.admissions)
    ? searchParams.admissions[0]
    : searchParams.admissions;
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;

  const boardId = boardParam ? Number(boardParam) : undefined;
  const maxClass = gradeParam || undefined;
  const admissionsOpen = admissionsParam === "open";
  const page = pageParam ? Math.max(1, Number(pageParam) || 1) : 1;

  return { boardId, maxClass, admissionsOpen, page };
}

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
export type PlaceView = "hub" | "list";
export type BoardHub = { slug: string; boardId: number; name: string };

/** Metadata for a discovery page (D-121 §7): filters noindex; pagination self-canonical. */
export function placeMetadata(
  locale: string,
  resolved: ResolvedPlace,
  rawSearchParams: RawSearchParams,
  boardHub?: BoardHub & { count: number },
  view: "hub" | "list" = "list",
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

  if (boardHub) {
    return {
      title: `${boardHub.name} schools in ${city.cityName}, ${city.stateName}: grades and admissions — SchoolOye`,
      description: `${boardHub.count} ${boardHub.name} schools in ${city.cityName}, ${city.stateName}. Each listing shows the school's grades, location and admission status.`,
      alternates: { canonical: localeCanonical(locale, `${path}/${boardHub.slug}-schools`) },
    };
  }

  const isHubMeta = view === "hub" && !city.isCityState;
  const listPath = city.isCityState ? path : `${path}/all-schools`;
  if (isHubMeta) {
    return {
      title: `Schools in ${city.cityName}, ${city.stateName}: boards, areas and admissions — SchoolOye`,
      description: `Browse ${city.schoolCount} schools in ${city.cityName}, ${city.stateName} by board, area and admission status. Each listing shows the school's board, grades, location and how to contact it.`,
      alternates: { canonical: localeCanonical(locale, path) },
    };
  }

  return {
    title: `Schools in ${city.cityName}, ${city.stateName}${page > 1 ? ` (page ${page})` : ""}: boards, grades and admissions — SchoolOye`,
    description: `Browse ${city.schoolCount} schools in ${city.cityName}, ${city.stateName}. Each listing shows the school's board, grades, location and admission status.`,
    alternates: {
      canonical: localeCanonical(
        locale,
        !filtersActive && page > 1 ? `${listPath}?page=${page}` : listPath,
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
  now,
}: {
  locale: string;
  town: NonNullable<Awaited<ReturnType<typeof getPublicTownAreaBySlug>>>;
  schools: Awaited<ReturnType<typeof listPublicSchoolsByLocality>>;
  neighbors: Awaited<ReturnType<typeof listLocalityNeighbors>>;
  boardNames: Map<string, string>;
  admissionDeadlines: Map<string, string | null>;
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
          <ListingViewerProvider schoolIds={schools.map((s) => s.id)}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {schools.map((school) => {
                const board = boardNames.get(school.id);
                const grades = formatGradeRange(school.min_class, school.max_class);
                const meta = board ? `${boardShortName(board)} · ${grades}` : grades;

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
                    actions={<CardSaveButton schoolId={school.id} locale={locale} />}
                  />
                );
              })}
            </div>
          </ListingViewerProvider>
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
  boardHub,
  view = "list",
}: {
  locale: string;
  resolved: ResolvedPlace;
  rawSearchParams: RawSearchParams;
  /** "hub" = the city's overview page (previews, browse blocks); "list" = the full filterable listing. */
  view?: "hub" | "list";
  /** Set on /schools/{state}/{city}/{board}-schools: a path-based, indexable board listing. */
  boardHub?: BoardHub;
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
    const [boardNames, admissionDeadlines] = await Promise.all([
      getBoardNamesBySchoolId(schoolIds),
      getAdmissionDeadlinesBySchoolId(schoolIds),
    ]);

    return (
      <TownPageBody
        locale={locale}
        town={town}
        schools={schools}
        neighbors={neighbors}
        boardNames={boardNames}
        admissionDeadlines={admissionDeadlines}
        now={now}
      />
    );
  }

  const { city } = resolved;

  const isHub = view === "hub" && !boardHub && !city.isCityState;
  const pageSize = isHub ? HUB_PREVIEW_SIZE : PAGE_SIZE;
  const parsed = parseFilters(rawSearchParams);
  const { maxClass, admissionsOpen, page } = parsed;
  const boardId = boardHub?.boardId ?? parsed.boardId;
  // A board hub is its own indexable page, not a filtered variant of the city page.
  const filtersActive =
    (!boardHub && boardId !== undefined) || maxClass !== undefined || admissionsOpen;

  // district-scoped, not city_id-scoped: schools pending /ops locality
  // assignment still belong on the city's "all schools" listing.
  const [{ schools, total }, filterOptions, localities, categoryLinks, featuredPlacements] =
    await Promise.all([
      listPublicSchoolsByDistrict(city.districtIds, {
        boardId,
        maxClass,
        admissionsOpen,
        page,
        pageSize,
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
  const [boardNames, admissionDeadlines] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
  ]);

  // ============================================================================
  // CITY HUB VIEW: Return early with hub layout instead of full listing
  // ============================================================================
  if (isHub) {
    // Prepare data for hub layout
    const now = new Date();

    // Featured schools: just show first 6 for now (no rating data yet)
    const featuredSchools = schools.slice(0, 6).map((s) => ({
      id: s.id,
      name_en: s.name_en,
      slug: s.slug,
      min_class: s.min_class,
      max_class: s.max_class,
      rating: null,
      review_count: null,
    }));

    // Active admissions: schools with active_admission_count > 0
    const activeAdmissions = schools
      .filter((s) => s.active_admission_count && s.active_admission_count > 0)
      .sort((a, b) => (b.active_admission_count ?? 0) - (a.active_admission_count ?? 0))
      .slice(0, 6)
      .map((s) => ({
        id: s.id,
        name_en: s.name_en,
        slug: s.slug,
        active_admission_count: s.active_admission_count ?? 0,
      }));

    // Board groups: aggregate by board from categoryLinks
    const boardMap = new Map<number, { name: string; count: number }>();
    categoryLinks.forEach((link) => {
      const existing = boardMap.get(link.board.id) || { name: link.board.name_en, count: 0 };
      existing.count += link.count;
      boardMap.set(link.board.id, existing);
    });

    const boardGroups = Array.from(boardMap.entries())
      .map(([boardId, board]) => ({
        boardId,
        boardName: board.name,
        schoolCount: board.count,
        exampleSchools: [],
      }))
      .sort((a, b) => b.schoolCount - a.schoolCount);

    // Localities: group schools by locality and count
    const localitiesBySlug = localities.reduce(
      (acc, loc) => {
        const count = schools.filter((s) => s.locality_id === loc.id).length;
        return acc.set(loc.slug, { id: loc.id, name: loc.name, slug: loc.slug, schoolCount: count });
      },
      new Map<string, { id: number; name: string; slug: string; schoolCount: number }>()
    );

    // Exact count of schools with open admissions across the whole city. The
    // `schools` array above is only one preview page, so counting it would undercount.
    const { total: openAdmissionsCount } = await listPublicSchoolsByDistrict(city.districtIds, {
      admissionsOpen: true,
      page: 1,
      pageSize: 1,
    });

    return (
      <CityHubLayout
        locale={locale}
        city={city}
        openAdmissionsCount={openAdmissionsCount}
        featuredSchools={featuredSchools}
        activeAdmissions={activeAdmissions}
        localities={Array.from(localitiesBySlug.values()).sort((a, b) => b.schoolCount - a.schoolCount)}
        boardGroups={boardGroups}
        now={now}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cityBasePath = cityPath(locale, city.stateSlug, city.citySlug);
  const allSchoolsPath = city.isCityState ? cityBasePath : `${cityBasePath}/all-schools`;
  const basePath = boardHub ? `${cityBasePath}/${boardHub.slug}-schools` : allSchoolsPath;

  function buildHref(
    overrides: Partial<{
      board: string;
      grade: string;
      admissions: string;
      page: string;
    }>,
  ) {
    const merged = {
      board: boardId !== undefined && !boardHub ? String(boardId) : "",
      grade: maxClass ?? "",
      admissions: admissionsOpen ? "open" : "",
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

  // CollectionPage + ItemList of the schools on this page, so a crawler or answer
  // engine reads the listing as a list of schools (each pointing at its canonical
  // page) rather than inferring it from card markup. Only for the unfiltered
  // listing: filtered variants are noindex.
  const listingJsonLd = filtersActive
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${siteUrl}${page > 1 ? `${basePath}?page=${page}` : basePath}`,
        url: `${siteUrl}${page > 1 ? `${basePath}?page=${page}` : basePath}`,
        name: boardHub
          ? `${boardHub.name} schools in ${city.cityName}, ${city.stateName}`
          : `Schools in ${city.cityName}, ${city.stateName}`,
        isPartOf: { "@id": `${siteUrl}/#website` },
        inLanguage: "en-IN",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: total,
          itemListElement: schools.map((school, i) => ({
            "@type": "ListItem",
            position: (page - 1) * pageSize + i + 1,
            url: `${siteUrl}${schoolPath("en", school.slug)}`,
            name: school.name_en ?? undefined,
          })),
        },
      };

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 pb-24 md:px-10 md:py-9 md:pb-9">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {listingJsonLd && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
        />
      )}

      {!city.isCityState && (
        <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
          <Link href={statePath(locale, city.stateSlug)}>{city.stateName}</Link>
          <span className="mx-1.5" aria-hidden="true">
            /
          </span>
          <span className="text-ink">{city.cityName}</span>
        </nav>
      )}

      <h1 className="font-display text-title-m md:text-title-d">
        {boardHub
          ? `${boardHub.name} schools in ${city.cityName}`
          : isHub
            ? `Schools in ${city.cityName}`
            : city.isCityState
              ? `${city.cityName} schools`
              : `All schools in ${city.cityName}`}
      </h1>
      <p className="mt-1 text-body text-muted-ink">
        {total} school{total === 1 ? "" : "s"}
        {filtersActive ? " matching your filters" : ""}
      </p>

      {isHub && (
        <>
          <p className="mt-3 max-w-(--container-read) text-body">
            SchoolOye lists {total.toLocaleString("en-IN")} schools in {city.cityName},{" "}
            {city.stateName}. Each school has one page with its board, grades, location and
            admission status, and facts we have not confirmed are marked as such.
          </p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
            <Link
              href={allSchoolsPath}
              className="flex min-h-15 flex-col justify-center rounded-md border border-ruled-blue bg-copy-white px-3.5 py-3 hover:bg-pill-results-bg"
            >
              <span className="font-display text-card font-semibold text-ruled-blue">
                All schools
              </span>
              <span className="text-body text-muted-ink">
                {total.toLocaleString("en-IN")} in {city.cityName}
              </span>
            </Link>
            <Link
              href={`${allSchoolsPath}?admissions=open`}
              rel="nofollow"
              className="flex min-h-15 flex-col justify-center rounded-md border border-line-blue bg-copy-white px-3.5 py-3 hover:border-ruled-blue"
            >
              <span className="font-display text-card font-semibold text-ruled-blue">
                Admissions open
              </span>
              <span className="text-body text-muted-ink">Schools with an open window</span>
            </Link>
            {filterOptions.maxClasses.slice(0, 2).map((code) => (
              <Link
                key={code}
                href={`${allSchoolsPath}?grade=${code}`}
                rel="nofollow"
                className="flex min-h-15 flex-col justify-center rounded-md border border-line-blue bg-copy-white px-3.5 py-3 hover:border-ruled-blue"
              >
                <span className="font-display text-card font-semibold text-ruled-blue">
                  {formatGradeRange(null, code)}
                </span>
                <span className="text-body text-muted-ink">Filter by grades</span>
              </Link>
            ))}
          </div>
        </>
      )}

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

      {isHub && <CityHighlights locale={locale} city={city} />}

      {categoryLinks.length > 0 && (
        <div className="mt-5">
          <h2 className="text-meta font-semibold text-muted-ink">Browse by category</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryLinks.map(({ board, count }) => (
              <Link
                key={board.id}
                href={
                  count >= BOARD_HUB_MIN_SCHOOLS && !city.isCityState
                    ? `${cityBasePath}/${boardHubSlug(board.name_en)}-schools`
                    : `${allSchoolsPath}?board=${board.id}`
                }
                className="flex min-h-9 items-center gap-1.5 rounded-md border border-rule bg-copy-white px-3 text-body font-medium hover:border-ruled-blue"
              >
                {boardShortName(board.name_en)} schools
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

      {!isHub && (
        <Form action={basePath} className="mt-5 flex flex-wrap items-end gap-3">
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
      )}

      {isHub && (
        <div className="mt-8 flex items-baseline justify-between gap-2 border-b border-rule pb-2">
          <h2 className="font-display text-card md:text-section">Schools in {city.cityName}</h2>
          <Link href={allSchoolsPath} className="font-semibold text-body text-ruled-blue">
            See all {total.toLocaleString("en-IN")} schools →
          </Link>
        </div>
      )}

      <div className="mt-6">
        {schools.length > 0 ? (
          <ListingViewerProvider schoolIds={schools.map((s) => s.id)}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {schools.map((school) => {
                const board = boardNames.get(school.id);
                const grades = formatGradeRange(school.min_class, school.max_class);
                const meta = board ? `${boardShortName(board)} · ${grades}` : grades;

                const closesOn = admissionDeadlines.get(school.id);
                const deadline = { closesAt: closesOn ? new Date(closesOn) : null };
                const pill = deadlineToPill(deadlineState(deadline, now));

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
                    actions={
                      <CardSaveButton schoolId={school.id} locale={locale} span="col-span-1" />
                    }
                  />
                );
              })}
            </div>
          </ListingViewerProvider>
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

      {isHub && total > pageSize && (
        <div className="mt-6 flex justify-center">
          <Link
            href={allSchoolsPath}
            className="flex h-11 items-center rounded-md bg-ruled-blue px-6 font-semibold text-copy-white"
          >
            See all {total.toLocaleString("en-IN")} schools in {city.cityName}
          </Link>
        </div>
      )}

      {!isHub && total > PAGE_SIZE && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          {page > 1 && (
            <Link href={pageHref(page - 1)} rel="prev" className="font-semibold text-ruled-blue">
              ← Previous
            </Link>
          )}
          {paginationWindow(page, totalPages).map((entry, i) =>
            entry === "gap" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: static ellipsis markers
              <span key={`gap-${i}`} className="px-1 text-muted-ink">
                …
              </span>
            ) : entry === page ? (
              <span
                key={entry}
                aria-current="page"
                className="flex h-10 min-w-10 items-center justify-center rounded-md bg-ruled-blue px-2 font-semibold text-copy-white"
              >
                {entry}
              </span>
            ) : (
              <Link
                key={entry}
                href={pageHref(entry)}
                aria-label={`Page ${entry}`}
                className="flex h-10 min-w-10 items-center justify-center rounded-md border border-line-blue px-2 font-semibold text-ruled-blue"
              >
                {entry}
              </Link>
            ),
          )}
          {page < totalPages && (
            <Link href={pageHref(page + 1)} rel="next" className="font-semibold text-ruled-blue">
              Next →
            </Link>
          )}
        </nav>
      )}

    </div>
  );
}
