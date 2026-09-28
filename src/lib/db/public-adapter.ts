import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  type PublicAdmissionUpdate,
  type PublicExamAdmission,
  type PublicExamApplicationStep,
  type PublicExamCentre,
  type PublicExamCorrection,
  type PublicExamFeeTier,
  type PublicExamMilestone,
  type PublicExamParticipatingSchool,
  type PublicExamReservationSplit,
  type PublicSchool,
  type PublicSchoolAdmission,
  type PublicSchoolBoard,
  type PublicSchoolNews,
  type PublicSchoolRanking,
  publicAdmissionUpdateContract,
  publicAreaContract,
  publicBoardContract,
  publicCityContract,
  publicDistrictContract,
  publicExamAdmissionContract,
  publicLocalityContract,
  publicLocalityNeighborContract,
  publicSchoolAdmissionContract,
  publicSchoolBoardContract,
  publicSchoolContract,
  publicSchoolNewsContract,
  publicSchoolRankingContract,
  publicSchoolRedirectContract,
  publicStateContract,
} from "@/contracts";
import { CITY_COOKIE_NAME } from "@/lib/city-cookie";
import { createApiSchemaClient } from "@/lib/db/public";
import { slugify } from "@/lib/slug";
import { titleCase } from "@/lib/text";
import { cityPath, schoolPath } from "@/lib/urls";

/**
 * Every public-facing data read in the app goes through this file — no page or
 * component queries Supabase directly. See scripts/check-public-adapter-imports.mjs
 * (CI-enforced) for the rule.
 *
 * Reads ONLY `api.*` views (via createApiSchemaClient()) — the curated,
 * source-redacted, owner-run surface (see docs/spec/data-and-trust.md), including small
 * passthrough views for pure reference data that has no redaction rules of its
 * own (public_districts/public_states/public_cities/public_boards —
 * db/views/045_reference_views.sql) and api.public_school_boards
 * (db/views/046_public_school_boards.sql, source-gated like public_schools'
 * other official facts). Every row read this way is validated against its Zod
 * contract in src/contracts (the same contracts scripts/verify-views.ts checks
 * against live data) since createApiSchemaClient() is intentionally untyped —
 * see its doc comment in src/lib/db/public.ts.
 *
 * No raw-table allowlist exceptions. `school_identifiers` and `field_provenance`
 * have no api.* view yet — `getPublicSchoolByIdSlug`'s identifiers/facts
 * sub-queries are unused today (nothing in School Page v2's Overview needs them)
 * and stay as a documented TODO, returning empty once the grants migration lands.
 */

export type { PublicSchool, PublicSchoolBoard };

export type PublicSchoolIdentifier = { scheme: string; value: string };

export type PublicSchoolFact = {
  field: string;
  value: unknown;
  source_id: number | null;
  evidence_url: string | null;
  created_at: string;
  verified_at: string | null;
};

export type PublicSchoolBundle = {
  school: PublicSchool;
  board: PublicSchoolBoard | null;
  /** Kept for shape compatibility; no public view exists for these (always empty). */
  identifiers: PublicSchoolIdentifier[];
  facts: PublicSchoolFact[];
};

async function getPublicSchoolBundle(
  column: "id" | "slug",
  value: string | number,
): Promise<PublicSchoolBundle | null> {
  const api = createApiSchemaClient();
  const { data: schoolRow, error } = await api
    .from("public_schools")
    .select("*")
    .eq(column, value)
    .maybeSingle();
  if (error || !schoolRow) return null;
  const school = publicSchoolContract.parse(schoolRow);
  const { data: boardRow } = await api
    .from("public_school_boards")
    .select("*")
    .eq("school_id", school.id)
    .limit(1)
    .maybeSingle();
  return {
    school,
    board: boardRow ? publicSchoolBoardContract.parse(boardRow) : null,
    identifiers: [],
    facts: [],
  };
}

/** Overview page data for one school by its internal UUID. Null if not public. */
export async function getPublicSchoolByIdSlug(id: string): Promise<PublicSchoolBundle | null> {
  return getPublicSchoolBundle("id", id);
}

/** The canonical resolver for /school/{slug} (D-121). Null if not public. */
export async function getPublicSchoolBySlug(slug: string): Promise<PublicSchoolBundle | null> {
  return getPublicSchoolBundle("slug", slug);
}

/**
 * Where a non-canonical school key should 301 to (merged schools, alias and
 * retired slugs) — api.public_school_redirects. Null if the key is unknown.
 */
export async function getSchoolRedirectSlug(key: {
  slug?: string;
  code?: number;
  id?: string;
}): Promise<string | null> {
  const api = createApiSchemaClient();
  let query = api.from("public_school_redirects").select("*").limit(1);
  if (key.slug) query = query.eq("from_slug", key.slug);
  else if (key.code !== undefined) query = query.eq("from_code", key.code);
  else if (key.id) query = query.eq("from_id", key.id);
  else return null;
  const { data } = await query.maybeSingle();
  return data ? publicSchoolRedirectContract.parse(data).to_slug : null;
}

/**
 * A school's canonical path from its id — for callers (teacher profile, claim
 * flow) that hold only a school id. Null if the school isn't public.
 */
export async function getSchoolCanonicalPath(
  schoolId: string,
  locale: string,
): Promise<string | null> {
  const result = await getPublicSchoolByIdSlug(schoolId);
  if (result) return schoolPath(locale, result.school.slug);
  const redirectSlug = await getSchoolRedirectSlug({ id: schoolId });
  return redirectSlug ? schoolPath(locale, redirectSlug) : null;
}

/**
 * Batched city lookup by district id, for pages that list schools across
 * potentially more than one city (Compare, saved schools) and need each row's
 * own city slug for its canonical link — unlike a single city/locality/search
 * page, which is already scoped to one city and can just reuse that slug.
 */
export async function getCitiesByDistrictIds(
  districtIds: number[],
): Promise<Map<number, PublicCity>> {
  const uniqueIds = [...new Set(districtIds)];
  if (uniqueIds.length === 0) return new Map();
  const api = createApiSchemaClient();
  const { data } = await api.from("public_cities").select("*").in("district_id", uniqueIds);
  const result = new Map<number, PublicCity>();
  for (const row of data ?? []) {
    const city = toPublicCity(publicCityContract.parse(row));
    result.set(city.districtId, city);
  }
  return result;
}

export type PublicDistrict = { id: number; name_en: string; slug: string; state_id: number };

/** District row by slug — internal use only (launch-flag gating, legacy-URL redirect). District never appears in the UI. */
export async function getPublicDistrictBySlug(slug: string): Promise<PublicDistrict | null> {
  const api = createApiSchemaClient();
  const { data, error } = await api
    .from("public_districts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return error || !data ? null : publicDistrictContract.parse(data);
}

/** District row by id — internal use only, same as getPublicDistrictBySlug. */
export async function getPublicDistrictById(id: number): Promise<PublicDistrict | null> {
  const api = createApiSchemaClient();
  const { data, error } = await api.from("public_districts").select("*").eq("id", id).maybeSingle();
  return error || !data ? null : publicDistrictContract.parse(data);
}

export type PublicState = { id: number; name_en: string; code: string };

export async function getPublicStateById(id: number): Promise<PublicState | null> {
  const api = createApiSchemaClient();
  const { data, error } = await api.from("public_states").select("*").eq("id", id).maybeSingle();
  return error || !data ? null : publicStateContract.parse(data);
}

/** No slug column on states — there are only a handful of rows, so slugify and match in JS. */
export async function getPublicStateBySlug(slug: string): Promise<PublicState | null> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_states").select("*");
  const states = (data ?? []).map((row) => publicStateContract.parse(row));
  return states.find((s) => slugify(s.name_en) === slug) ?? null;
}

/**
 * Real Jaipur-district towns added by supabase/seeds/jaipur_school_assignment.sql
 * — ordinary `localities` rows, but rendered with the town page template ("Near
 * X") instead of the locality template. The list lives here, in this repo's
 * code — kept in sync with the `is_town` computation in
 * db/views/050_public_localities.sql and 010_public_schools.sql.
 */
const TOWN_LOCALITY_SLUGS = new Set(["dudu", "tunga", "bassi", "kishangarh-renwal", "chomu"]);

export type PublicArea = {
  slug: string;
  name: string;
  state: string;
  school_count: number;
  is_launch: boolean;
  district_id: number;
  state_slug: string;
  district_ids: number[];
  is_city_state: boolean;
};

/**
 * Reads api.public_areas directly — that view already computes school_count
 * and is_launch. Wrapped in React's cache() (request memoization): this is
 * called independently by the root [locale]/layout.tsx (header/mobile nav)
 * AND by SiteFooter — every single page in the app was firing this exact
 * query twice, and Next's own Link prefetching multiplied that further (a
 * live production trace showed 16 near-identical calls in under a second on
 * ordinary navigation). cache() collapses repeat calls within one request
 * into a single query, for free — this data is also nearly static (launch
 * cities), so there's no correctness cost to reusing it across a request.
 */
export const listPublicAreas = cache(async (): Promise<PublicArea[]> => {
  const api = createApiSchemaClient();
  const { data, error } = await api.from("public_areas").select("*");
  if (error || !data) return [];
  return data.map((row) => publicAreaContract.parse(row));
});

export async function getPublicAreaBySlug(slug: string): Promise<PublicArea | null> {
  const areas = await listPublicAreas();
  return areas.find((a) => a.slug === slug) ?? null;
}

/**
 * Launched areas shaped for the shared shell (SiteHeader/MobileBottomNav/SiteFooter's
 * city picker) — every layout that renders that shell needs exactly this. Was
 * duplicated ad hoc in src/app/[locale]/layout.tsx; pulled in here (2026-09-28) when
 * src/app/for-schools/layout.tsx needed the identical list, so the two can't drift.
 */
export async function listLaunchedCityOptions(
  locale: string,
): Promise<{ slug: string; name: string; stateSlug: string; href: string }[]> {
  const areas = await listPublicAreas();
  return areas
    .filter((area) => area.is_launch)
    .map((area) => ({
      slug: area.slug,
      name: area.name,
      stateSlug: area.state_slug,
      href: cityPath(locale, area.state_slug, area.slug),
    }));
}

export type PublicStateAreaCity = { slug: string; name: string; schoolCount: number };

export type PublicStateArea = {
  stateSlug: string;
  stateName: string;
  cities: PublicStateAreaCity[];
  totalSchoolCount: number;
};

/**
 * State canonical page's data (docs/seo-canonical-pages-spec.md) — every launched
 * city in the state, with an honest (render-gated, not raw) count each, sorted
 * by count descending. Built from listPublicAreas() (already state-per-area,
 * no slug column on states so state.name is matched via slugify — same
 * approach as getPublicStateBySlug) rather than a new query. A state with no
 * launched cities returns null: it isn't a real page yet, just like a district
 * with is_launch=false isn't a real city page.
 */
export async function getPublicStateAreaBySlug(stateSlug: string): Promise<PublicStateArea | null> {
  // City-states (Delhi) have no separate state page: /schools/{state} is the city (D-126).
  const areas = (await listPublicAreas()).filter(
    (a) => a.is_launch && !a.is_city_state && a.state_slug === stateSlug,
  );
  if (areas.length === 0) return null;

  const cities = await Promise.all(
    areas.map(async (area) => ({
      slug: area.slug,
      name: area.name,
      schoolCount: await countRenderableSchoolsByDistrict(area.district_ids),
    })),
  );
  cities.sort((a, b) => b.schoolCount - a.schoolCount);

  return {
    stateSlug,
    stateName: areas[0].state,
    cities,
    totalSchoolCount: cities.reduce((sum, c) => sum + c.schoolCount, 0),
  };
}

/**
 * Which launched city the current request should show: the user's own choice
 * (CITY_COOKIE_NAME, set by src/components/shell/city-picker.tsx) if it's
 * still a launched area, otherwise the platform default (the first launched
 * area — today, and for the foreseeable future, Jaipur). Every page that
 * used to hardcode DISTRICT_SLUG/CITY_SLUG = "jaipur" should call this
 * instead, so it automatically follows both the user's pick and whichever
 * city is actually launched, with no per-page constant to keep in sync.
 *
 * Reads a cookie, so any Server Component that calls this opts into dynamic
 * (per-request) rendering for that render — there is no way to personalize
 * by the visitor's own cookie and keep a fully static/ISR'd page at the same
 * time. Acceptable trade-off for the pages that need real personalization
 * (search, home, alerts, teacher directory, claim); do not call this from
 * something that must stay statically generated (e.g. a sitemap route, which
 * has no visitor to personalize for anyway).
 */
export async function getSelectedAreaSlug(): Promise<string> {
  const launched = (await listPublicAreas()).filter((a) => a.is_launch);
  // "First launched area" isn't a stable notion — listPublicAreas() has no
  // ORDER BY, so its row order follows Postgres's own scan order (by
  // district id), not launch priority. Jaipur is picked as the default
  // deliberately: it's SchoolOye's primary/home market (2026-09-28 product
  // decision — operational priority, not a technical availability
  // distinction). is_launch itself (db/views/040_public_areas.sql, D-119) is
  // purely data-driven — "does this district have ≥1 published school" — so
  // every other launched area (Gurugram included, 480 published schools as
  // of this writing) is real, published inventory, not a thinner or
  // test-only area; Jaipur just isn't allowed to lose the default silently
  // to whichever area Postgres happens to return first.
  const fallback = launched.find((a) => a.slug === "jaipur")?.slug ?? launched[0]?.slug ?? "jaipur";
  const store = await cookies();
  const cookieSlug = store.get(CITY_COOKIE_NAME)?.value;
  return cookieSlug && launched.some((a) => a.slug === cookieSlug) ? cookieSlug : fallback;
}

/**
 * Same resolution as getSelectedAreaSlug, but returns the full city bundle
 * (name, state, district id for scoping queries, href-ready slugs) instead of
 * just the slug — what most pages actually need.
 */
export async function getSelectedCityArea(): Promise<PublicCityArea | null> {
  const slug = await getSelectedAreaSlug();
  return getPublicCityAreaBySlug(slug);
}

type PublicSchoolFilters = {
  query?: string;
  boardId?: number;
  maxClass?: string;
  admissionsOpen?: boolean;
  page?: number;
  pageSize?: number;
};

/**
 * Shared query behind listPublicSchoolsByDistrict (one city) and
 * searchPublicSchoolsSiteWide (every launched city, 2026-09-28) — `districtIds`
 * omitted/empty means no district restriction at all, which callers must not
 * do accidentally (see searchPublicSchoolsSiteWide's own guard).
 */
async function queryPublicSchools(
  districtIds: number[] | undefined,
  filters: PublicSchoolFilters,
): Promise<{ schools: PublicSchool[]; total: number }> {
  const {
    query: searchQuery,
    boardId,
    maxClass,
    admissionsOpen,
    page = 1,
    pageSize = 24,
  } = filters;
  const api = createApiSchemaClient();

  // Publish gate (D-119, 2026-09-28): api.public_schools itself now filters to
  // schools.status = 'published' (010_public_schools.sql) with every column
  // shown as stored — no per-field source/provenance gating here anymore, so
  // this query doesn't need its own null checks on top of the view.
  let query = api.from("public_schools").select("*", { count: "exact" });

  if (districtIds !== undefined) {
    query = query.in(
      "district_id",
      districtIds.length > 0 ? districtIds : [-1], // no launched districts → no results, never "every district"
    );
  }

  if (searchQuery) {
    query = query.ilike("name_en", `%${searchQuery}%`);
  }

  if (maxClass) {
    query = query.eq("max_class", maxClass);
  }

  if (boardId) {
    const { data: affiliated } = await api
      .from("public_school_boards")
      .select("*")
      .eq("board_id", boardId);
    const ids = (affiliated ?? []).map((a) => publicSchoolBoardContract.parse(a).school_id);
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  if (admissionsOpen) {
    // api.public_school_admissions, not raw admission_cycles. Per D-119
    // (28 Sep 2026) this view has no verification gate — a school is public
    // once schools.status = 'published', and every admission_cycles row for
    // it is shown as stored, regardless of verification status.
    const { data: cycles } = await api
      .from("public_school_admissions")
      .select("school_id")
      .in("status", ["open", "closing_soon"]);
    const ids = (cycles ?? []).map((c) => c.school_id as string);
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const from = (page - 1) * pageSize;
  const { data, count } = await query.range(from, from + pageSize - 1);

  return {
    schools: (data ?? []).map((row) => publicSchoolContract.parse(row)),
    total: count ?? 0,
  };
}

/** One district id or all of a city's district ids (PublicCityArea.districtIds, D-126). */
export type DistrictScope = number | number[];

function districtList(scope: DistrictScope): number[] {
  return Array.isArray(scope) ? scope : [scope];
}

/** Published schools in a city (one or more districts), for city listings. Newest first. */
export async function listPublicSchoolsByDistrict(
  scope: DistrictScope,
  filters: PublicSchoolFilters = {},
): Promise<{ schools: PublicSchool[]; total: number }> {
  return queryPublicSchools(districtList(scope), filters);
}

/**
 * Published schools across every launched city (2026-09-28) — what the header
 * search box and /schools page's `q` search actually need. Before this
 * existed, the only "search" was listPublicSchoolsByDistrict scoped to
 * getSelectedCityArea() — a visitor typing a school name that happened to be
 * in a different launched city than their currently-selected one got zero
 * results, even though the school was live on the site. Deliberately
 * restricted to launched districts only (listLaunchedDistrictIds), not every
 * district with a publish-gate pass: a result whose city page 404s
 * (city.isLaunch === false) would be worse than not surfacing it at all.
 */
export async function searchPublicSchoolsSiteWide(
  filters: PublicSchoolFilters,
): Promise<{ schools: PublicSchool[]; total: number }> {
  const districtIds = await listLaunchedDistrictIds();
  return queryPublicSchools(districtIds, filters);
}

/** district_id of every launched area — see api.public_areas.is_launch. */
export async function listLaunchedDistrictIds(): Promise<number[]> {
  const areas = await listPublicAreas();
  return areas.filter((a) => a.is_launch).flatMap((a) => a.district_ids);
}

/**
 * Head-count-only version of listPublicSchoolsByDistrict's publish gate — for
 * SEO-facing pages (state/city canonical pages) that need an honest count
 * without paging through rows. PublicCityArea.schoolCount and
 * api.public_areas.school_count are both raw/unfiltered (every school row in
 * the district, published or not) — using those on a public-facing "N schools
 * in Gurugram" figure would repeat the same illusion that led to the is_launch
 * rewrite (2026-09-28): a big number that doesn't match what a visitor can
 * actually click through to. D-119: api.public_schools already holds only published schools, so this
 * is a plain count with the same district filter as listPublicSchoolsByDistrict.
 */
export async function countRenderableSchoolsByDistrict(scope: DistrictScope): Promise<number> {
  const api = createApiSchemaClient();
  const { count } = await api
    .from("public_schools")
    .select("id", { count: "exact", head: true })
    .in("district_id", districtList(scope));
  return count ?? 0;
}

export type PublicDistrictFilterOptions = { boards: PublicBoard[]; maxClasses: string[] };

/** Only the boards and grade ranges actually present in this district — never a dead dropdown option. */
export async function listDistrictFilterOptions(
  scope: DistrictScope,
): Promise<PublicDistrictFilterOptions> {
  const api = createApiSchemaClient();

  const { data: schools } = await api
    .from("public_schools")
    .select("id, max_class")
    .in("district_id", districtList(scope));

  const schoolIds = (schools ?? []).map((s) => s.id as string);
  const maxClasses = [
    ...new Set((schools ?? []).map((s) => s.max_class as string | null).filter((v) => v != null)),
  ];

  if (schoolIds.length === 0) return { boards: [], maxClasses };

  const { data: schoolBoards } = await api
    .from("public_school_boards")
    .select("*")
    .in("school_id", schoolIds);
  const byId = new Map(
    (schoolBoards ?? [])
      .map((row) => publicSchoolBoardContract.parse(row))
      .map((b) => [b.board_id, { id: b.board_id, name_en: b.board_name }]),
  );
  return { boards: [...byId.values()], maxClasses };
}

export type PublicBoard = { id: number; name_en: string };

export async function listPublicBoards(): Promise<PublicBoard[]> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_boards").select("*");
  return (data ?? []).map((row) => publicBoardContract.parse(row));
}

export type PublicBoardCategoryLink = { board: PublicBoard; count: number };

/**
 * "Browse by category" links for a city/state page (docs/seo-canonical-pages-spec.md) —
 * per docs/seo-canonical-pages-spec.md, board affiliation is the one category that's
 * both real and not source-gated (school_affiliations isn't subject to the
 * field_provenance/UDISE rule that blocks management/gender/established_year),
 * so it's the only "Top {Board} Schools in {Area}" style link that ships in this
 * pass. Reuses listDistrictFilterOptions' already-detected board list, then adds
 * a real per-board count and drops any board with zero — never links to an
 * empty result. Board name is used verbatim (e.g. "CBSE"), never re-labelled
 * with an invented ranking word.
 */
export async function getBoardCategoryLinksForDistrict(
  scope: DistrictScope,
): Promise<PublicBoardCategoryLink[]> {
  const { boards } = await listDistrictFilterOptions(scope);
  const links = await Promise.all(
    boards.map(async (board) => {
      const { total } = await listPublicSchoolsByDistrict(scope, {
        boardId: board.id,
        pageSize: 1,
      });
      return { board, count: total };
    }),
  );
  return links.filter((link) => link.count > 0).sort((a, b) => b.count - a.count);
}

export type PublicOpenAdmission = {
  schoolId: string;
  slug: string;
  schoolCode: number;
  nameEn: string;
  status: string;
  closesOn: string | null;
};

/** Published schools in a district with a currently-open, approved admission cycle, soonest deadline first. */
export async function listOpenAdmissionsByDistrict(
  scope: DistrictScope,
  limit = 3,
): Promise<PublicOpenAdmission[]> {
  const api = createApiSchemaClient();

  const { data: schools } = await api
    .from("public_schools")
    .select("id, slug, school_code, name_en")
    .in("district_id", districtList(scope));

  const schoolIds = (schools ?? []).map((s) => s.id as string);
  if (schoolIds.length === 0) return [];

  const { data: cycles } = await api
    .from("public_school_admissions")
    .select("school_id, status, closes_on")
    .in("school_id", schoolIds)
    .in("status", ["open", "closing_soon"])
    .order("closes_on", { ascending: true })
    .limit(limit);

  const bySchoolId = new Map((schools ?? []).map((s) => [s.id as string, s]));
  return (cycles ?? []).flatMap((cycle) => {
    const school = bySchoolId.get(cycle.school_id as string);
    if (!school) return [];
    return [
      {
        schoolId: school.id as string,
        slug: school.slug as string,
        schoolCode: school.school_code as number,
        nameEn: school.name_en as string,
        status: cycle.status as string,
        closesOn: cycle.closes_on as string | null,
      },
    ];
  });
}

/** One board name per school (first affiliation), for list-card meta lines. Empty map entries are omitted, not guessed. */
export async function getBoardNamesBySchoolId(schoolIds: string[]): Promise<Map<string, string>> {
  if (schoolIds.length === 0) return new Map();

  const api = createApiSchemaClient();
  const { data: schoolBoardRows } = await api
    .from("public_school_boards")
    .select("*")
    .in("school_id", schoolIds);
  const schoolBoards = (schoolBoardRows ?? []).map((row) => publicSchoolBoardContract.parse(row));

  const result = new Map<string, string>();
  for (const row of schoolBoards) {
    if (!result.has(row.school_id)) {
      result.set(row.school_id, row.board_name);
    }
  }
  return result;
}

/**
 * Soonest admission_cycles.closes_on per school, for list-card DeadlineMargin
 * rails, read via api.public_school_admissions rather than the raw table (for
 * the shared api-schema access path, not an approval filter). Under D-119
 * (28 Sep 2026) the view has no verification gate — every cycle of a published
 * school is shown as stored; a stale comment here previously claimed the view
 * only exposed verification IN ('ops_verified','school_verified') cycles, which
 * was true before D-119 suspended that rule and is not true of the live view now.
 */
export async function getAdmissionDeadlinesBySchoolId(
  schoolIds: string[],
): Promise<Map<string, string | null>> {
  if (schoolIds.length === 0) return new Map();

  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_school_admissions")
    .select("school_id, closes_on")
    .in("school_id", schoolIds)
    .order("closes_on", { ascending: true });

  const result = new Map<string, string | null>();
  for (const row of data ?? []) {
    const schoolId = row.school_id as string;
    if (!result.has(schoolId)) {
      result.set(schoolId, row.closes_on as string | null);
    }
  }
  return result;
}

/** Every approved admission cycle for one school (any status), soonest-closing first — for the school page's admissions summary. */
export async function getPublicAdmissionsBySchoolId(
  schoolId: string,
): Promise<PublicSchoolAdmission[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_school_admissions")
    .select("*")
    .eq("school_id", schoolId)
    .order("closes_on", { ascending: true, nullsFirst: false });
  return (data ?? []).map((row) => publicSchoolAdmissionContract.parse(row));
}

/**
 * Approved, published news/press posts for one school, newest first — reads only
 * `api.public_school_news` (db/views/095_public_school_news.sql), which already
 * filters to `review = 'approved'` and a published school; nothing further to filter
 * here.
 */
export async function getPublicSchoolNewsBySchoolId(schoolId: string): Promise<PublicSchoolNews[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_school_news")
    .select("*")
    .eq("school_id", schoolId)
    .order("published_at", { ascending: false });
  return (data ?? []).map((row) => publicSchoolNewsContract.parse(row));
}

/**
 * Recent admission-cycle changes for one school, most recent first — reads only
 * `api.public_admission_updates` (db/views/096_public_admission_updates.sql), which
 * already scopes to admission_cycles-only audit rows with a real change in the
 * allowlisted fields. `limit` defaults to 5 — this is a "recent updates" strip, not a
 * full history browser.
 */
export async function getRecentAdmissionUpdatesBySchoolId(
  schoolId: string,
  limit = 5,
): Promise<PublicAdmissionUpdate[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_admission_updates")
    .select("*")
    .eq("school_id", schoolId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => publicAdmissionUpdateContract.parse(row));
}

export type PublicCity = { id: number; name_en: string; slug: string; districtId: number };

function toPublicCity(row: {
  id: number;
  name_en: string;
  slug: string;
  district_id: number;
}): PublicCity {
  return { id: row.id, name_en: row.name_en, slug: row.slug, districtId: row.district_id };
}

export async function getPublicCityBySlug(slug: string): Promise<PublicCity | null> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_cities").select("*").eq("slug", slug).maybeSingle();
  return data ? toPublicCity(publicCityContract.parse(data)) : null;
}

/** The city inside a district — internal use only (legacy district-slug redirect resolution). District never appears in the UI. */
export async function getPublicCityByDistrictId(districtId: number): Promise<PublicCity | null> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_cities")
    .select("*")
    .eq("district_id", districtId)
    .maybeSingle();
  return data ? toPublicCity(publicCityContract.parse(data)) : null;
}

/** City row by numeric id — used where a caller already has a city_id (e.g. an alert
 * subscription's own city_id) and needs its display name, without assuming which city
 * that is. */
export async function getPublicCityById(id: number): Promise<PublicCity | null> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_cities").select("*").eq("id", id).maybeSingle();
  return data ? toPublicCity(publicCityContract.parse(data)) : null;
}

export type PublicCityArea = {
  citySlug: string;
  cityName: string;
  /** Internal only — never render. Representative district (first of districtIds). */
  districtId: number;
  /** Internal only — every district the city covers; scope all city queries by this (D-126). */
  districtIds: number[];
  /** City-states (Delhi): the city is the state; its URL is /schools/{state} (D-126). */
  isCityState: boolean;
  stateSlug: string;
  stateName: string;
  schoolCount: number;
  isLaunch: boolean;
};

/**
 * A launchable city from api.public_areas: an ordinary district-city (Gurugram,
 * Jaipur) or a whole city-state (Delhi, D-126). Districts never surface past
 * this function. schoolCount = published schools in the city.
 */
export async function getPublicCityAreaBySlug(citySlug: string): Promise<PublicCityArea | null> {
  const area = await getPublicAreaBySlug(citySlug);
  if (!area) return null;
  return {
    citySlug: area.slug,
    cityName: titleCase(area.name),
    districtId: area.district_id,
    districtIds: area.district_ids,
    isCityState: area.is_city_state,
    stateSlug: area.state_slug,
    stateName: area.state,
    schoolCount: area.school_count,
    isLaunch: area.is_launch,
  };
}

export type PublicTownArea = {
  townSlug: string;
  townName: string;
  localityId: number;
  cityId: number;
  citySlug: string;
  stateSlug: string;
  stateName: string;
  schoolCount: number;
  isLaunch: boolean;
};

/**
 * Town resolved as a peer of the city in the URL (`/[locale]/[town]`, not
 * nested under a city) — matches the TOWN_LOCALITY_SLUGS set. Global lookup by
 * slug only: the URL carries no state segment (city is the only geography
 * segment — see the routing decision log), so there's nothing left to scope
 * against. Fine while every launched town lives in one state; if a same-named
 * town in a different state ever launches, TOWN_LOCALITY_SLUGS collides and
 * needs its own disambiguation then.
 */
export async function getPublicTownAreaBySlug(townSlug: string): Promise<PublicTownArea | null> {
  if (!TOWN_LOCALITY_SLUGS.has(townSlug)) return null;

  const api = createApiSchemaClient();

  const { data: localityRow } = await api
    .from("public_localities")
    .select("*")
    .eq("slug", townSlug)
    .maybeSingle();
  if (!localityRow) return null;
  const locality = publicLocalityContract.parse(localityRow);

  const city = await getPublicCityBySlug(locality.city_slug);
  if (!city) return null;

  const { data: districtRow } = await api
    .from("public_districts")
    .select("*")
    .eq("id", city.districtId)
    .maybeSingle();
  if (!districtRow) return null;
  const district = publicDistrictContract.parse(districtRow);
  const state = await getPublicStateById(district.state_id);
  if (!state) return null;

  const area = await getPublicAreaBySlug(district.slug);

  return {
    townSlug: locality.slug,
    townName: locality.name,
    localityId: locality.id,
    cityId: city.id,
    citySlug: city.slug,
    stateSlug: slugify(state.name_en),
    stateName: state.name_en,
    schoolCount: locality.school_count,
    isLaunch: area?.is_launch ?? false,
  };
}

/**
 * For 308ing an old `/[locale]/[district]/...` URL to the matching
 * `/[locale]/[city]/...` one. Returns null if the slug isn't a known district,
 * or if it already equals the city's own slug (Jaipur's city and district
 * slugs happen to be identical today, so no redirect fires for it — this
 * exists for the day a district and its city slug diverge).
 */
export async function getRedirectCitySlugForDistrictSlug(
  districtSlug: string,
): Promise<string | null> {
  const district = await getPublicDistrictBySlug(districtSlug);
  if (!district) return null;
  const city = await getPublicCityByDistrictId(district.id);
  if (!city || city.slug === districtSlug) return null;
  return city.slug;
}

export type PublicLocality = {
  id: number;
  slug: string;
  name: string;
  nameHi: string | null;
  isTown: boolean;
  lat: number | null;
  lng: number | null;
  schoolCount: number;
};

function toPublicLocality(row: {
  id: number;
  slug: string;
  name: string;
  name_hi: string | null;
  is_town: boolean;
  lat: number | null;
  lng: number | null;
  school_count: number;
}): PublicLocality {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameHi: row.name_hi,
    isTown: row.is_town,
    lat: row.lat,
    lng: row.lng,
    schoolCount: row.school_count,
  };
}

/** Locality/town row by slug within a city, for locality and town pages. Null if not found, superseded, or inactive. */
export async function getPublicLocalityBySlug(
  citySlug: string,
  localitySlug: string,
): Promise<PublicLocality | null> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_localities")
    .select("*")
    .eq("city_slug", citySlug)
    .eq("slug", localitySlug)
    .maybeSingle();
  return data ? toPublicLocality(publicLocalityContract.parse(data)) : null;
}

/**
 * Localities/towns in a city with at least `minSchools` published schools — the
 * locality index only lists places with enough schools to be worth a page,
 * per the Jaipur pivot instruction.
 */
export async function listPublicLocalitiesByCity(
  citySlug: string,
  minSchools = 3,
): Promise<PublicLocality[]> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_localities").select("*").eq("city_slug", citySlug);
  if (!data || data.length === 0) return [];

  return data
    .map((row) => toPublicLocality(publicLocalityContract.parse(row)))
    .filter((l) => l.schoolCount >= minSchools)
    .sort((a, b) => b.schoolCount - a.schoolCount);
}

/**
 * Published schools assigned to one locality/town, for the locality page's
 * school list. Same publish gate as listPublicSchoolsByDistrict (2026-09-28)
 * — a discovery listing, so it needs the same name/address/pincode-renders
 * filter, not just a locality match.
 */
export async function listPublicSchoolsByLocality(localityId: number): Promise<PublicSchool[]> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_schools").select("*").eq("locality_id", localityId);
  return (data ?? []).map((row) => publicSchoolContract.parse(row));
}

/**
 * Schools by id, for the Compare page — order is not guaranteed to match
 * `ids`, callers re-sort if needed. Deliberately NOT gated like the discovery
 * listings above: these ids come from the user's own shortlist/compare
 * selection, not a browse query, so a school they already picked shouldn't
 * disappear just because a fact is unsourced.
 */
export async function listPublicSchoolsByIds(ids: string[]): Promise<PublicSchool[]> {
  if (ids.length === 0) return [];
  const api = createApiSchemaClient();
  const { data } = await api.from("public_schools").select("*").in("id", ids);
  return (data ?? []).map((row) => publicSchoolContract.parse(row));
}

/**
 * Published schools matching a name, across every city — for a teacher's
 * "request to join" search. Deliberately NOT gated like the discovery
 * listings above: a teacher must be able to find and claim their own real
 * school even if its address/pincode aren't sourced yet.
 */
export async function searchPublicSchoolsByName(
  query: string,
  limit = 10,
): Promise<PublicSchool[]> {
  if (!query.trim()) return [];
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_schools")
    .select("*")
    .ilike("name_en", `%${query.trim()}%`)
    .limit(limit);
  return (data ?? []).map((row) => publicSchoolContract.parse(row));
}

export type PublicLocalityNeighbor = { slug: string; name: string; method: "source" | "computed" };

/** Neighbouring localities for a locality page's "Nearby" section, nearest first. */
export async function listLocalityNeighbors(
  localitySlug: string,
): Promise<PublicLocalityNeighbor[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_locality_neighbors")
    .select("*")
    .eq("locality_slug", localitySlug)
    .order("distance_meters", { ascending: true, nullsFirst: false });

  return (data ?? []).map((row) => {
    const neighbor = publicLocalityNeighborContract.parse(row);
    return { slug: neighbor.neighbor_slug, name: neighbor.neighbor_name, method: neighbor.method };
  });
}

export type { PublicSchoolRanking };

/**
 * Editorial ranking placements (e.g. cforerankings.com) for a "Top schools"
 * article page — not part of the core directory/search. Reads
 * api.public_school_rankings, which already applies the publish-gate and
 * field-trust redaction via api.public_schools underneath, so a school that
 * drops out of trust or gets un-published simply disappears from here too.
 */
export async function listSchoolRankings(citySlug: string): Promise<PublicSchoolRanking[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_school_rankings")
    .select("*")
    .eq("city_slug", citySlug)
    .order("category", { ascending: true })
    .order("rank", { ascending: true });
  return (data ?? []).map((row) => publicSchoolRankingContract.parse(row));
}

export type {
  PublicExamAdmission,
  PublicExamApplicationStep,
  PublicExamCentre,
  PublicExamCorrection,
  PublicExamFeeTier,
  PublicExamMilestone,
  PublicExamParticipatingSchool,
  PublicExamReservationSplit,
};

/**
 * Every approved admission cycle for one national/multi-school exam (e.g. RMS
 * CET), one row per class level, soonest-closing first — for the exam hub
 * page. Reads api.public_exam_admissions, the exam-scoped twin of
 * api.public_school_admissions (same verification/publish gate, same
 * days_to_close computed column), joining exams instead of schools.
 */
export async function getPublicAdmissionsByExamSlug(
  examSlug: string,
): Promise<PublicExamAdmission[]> {
  const api = createApiSchemaClient();
  // Newest academic_year first ("2027-28" sorts correctly against "2026-27"
  // as plain text since both are the same YYYY-YY shape) so a freshly added
  // cycle — even one with no closes_on yet, e.g. status "not_announced" —
  // always surfaces above a resolved cycle from a prior year. closes_on is
  // only a tiebreak within the same year (multiple class tracks).
  const { data } = await api
    .from("public_exam_admissions")
    .select("*")
    .eq("slug", examSlug)
    .order("academic_year", { ascending: false })
    .order("closes_on", { ascending: true, nullsFirst: false });
  return (data ?? []).map((row) => publicExamAdmissionContract.parse(row));
}

export type PublicExamSummary = {
  slug: string;
  nameEn: string;
  conductingBody: string | null;
  classCodes: string[];
  academicYears: string[];
  soonestOpensOn: string | null;
  soonestClosesOn: string | null;
  /** Latest last_checked_at across the exam's cycles — sitemap lastmod, not shown to readers. */
  lastCheckedAt: string | null;
};

/**
 * One row per distinct exam (not per cycle) — for the /exams hub page. Groups
 * api.public_exam_admissions by exam and keeps just enough to render a card
 * linking to /exams/[slug]. Same publish gate as getPublicAdmissionsByExamSlug
 * (the view itself only exposes ops_verified/school_verified cycles); the
 * query is already ordered soonest-closing-first, so the first cycle seen per
 * exam is the one whose open/close dates the card shows.
 */
export async function listPublicExams(): Promise<PublicExamSummary[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_exam_admissions")
    .select(
      "slug, name_en, conducting_body, class_code, academic_year, opens_on, closes_on, last_checked_at",
    )
    .order("closes_on", { ascending: true, nullsFirst: false });

  const bySlug = new Map<string, PublicExamSummary>();
  for (const row of data ?? []) {
    const existing = bySlug.get(row.slug);
    if (!existing) {
      bySlug.set(row.slug, {
        slug: row.slug,
        nameEn: row.name_en,
        conductingBody: row.conducting_body,
        classCodes: [row.class_code],
        academicYears: [row.academic_year],
        soonestOpensOn: row.opens_on,
        soonestClosesOn: row.closes_on,
        lastCheckedAt: row.last_checked_at,
      });
      continue;
    }
    if (!existing.classCodes.includes(row.class_code)) existing.classCodes.push(row.class_code);
    if (!existing.academicYears.includes(row.academic_year)) {
      existing.academicYears.push(row.academic_year);
    }
    if (
      row.last_checked_at &&
      (!existing.lastCheckedAt || row.last_checked_at > existing.lastCheckedAt)
    ) {
      existing.lastCheckedAt = row.last_checked_at;
    }
  }
  return Array.from(bySlug.values());
}
