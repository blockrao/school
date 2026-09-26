import "server-only";
import { cookies } from "next/headers";
import {
  type PublicSchool,
  type PublicSchoolAdmission,
  type PublicSchoolBoard,
  type PublicSchoolRanking,
  publicAreaContract,
  publicBoardContract,
  publicCityContract,
  publicDistrictContract,
  publicLocalityContract,
  publicLocalityNeighborContract,
  publicSchoolAdmissionContract,
  publicSchoolBoardContract,
  publicSchoolContract,
  publicSchoolRankingContract,
  publicStateContract,
} from "@/contracts";
import { CITY_COOKIE_NAME } from "@/lib/city-cookie";
import { createApiSchemaClient, createPublicClient } from "@/lib/db/public";
import { schoolPath } from "@/lib/school-url";
import { slugify } from "@/lib/slug";
import { titleCase } from "@/lib/text";

/**
 * Every public-facing data read in the app goes through this file — no page or
 * component queries Supabase directly. See scripts/check-public-adapter-imports.mjs
 * (CI-enforced) for the rule.
 *
 * Reads ONLY `api.*` views (via createApiSchemaClient()) — the curated,
 * source-redacted, owner-run surface (see docs/DATA_ACCESS.md), including small
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

/** Overview page data for one school. Null if not found. */
export async function getPublicSchoolByIdSlug(id: string): Promise<{
  school: PublicSchool;
  board: PublicSchoolBoard | null;
  identifiers: PublicSchoolIdentifier[];
  facts: PublicSchoolFact[];
} | null> {
  const api = createApiSchemaClient();
  const publicClient = createPublicClient();

  const { data: schoolRow, error } = await api
    .from("public_schools")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !schoolRow) return null;
  const school = publicSchoolContract.parse(schoolRow);

  // TODO: school_identifiers/field_provenance have no api.* view yet, and no
  // raw-table grant after the grants-hardening migration — these return empty
  // until proper views exist. Unused today (nothing in Overview needs them).
  const [boardResult, identifiersResult, factsResult] = await Promise.all([
    api.from("public_school_boards").select("*").eq("school_id", id).maybeSingle(),
    publicClient.from("school_identifiers").select("scheme, value").eq("school_id", id),
    publicClient
      .from("field_provenance")
      .select("field, value, source_id, evidence_url, created_at, verified_at")
      .eq("entity_table", "schools")
      .eq("entity_id", id),
  ]);

  return {
    school,
    board: boardResult.data ? publicSchoolBoardContract.parse(boardResult.data) : null,
    identifiers: identifiersResult.data ?? [],
    facts: factsResult.data ?? [],
  };
}

/**
 * Same shape as getPublicSchoolByIdSlug, keyed by the stable school_code
 * instead of the UUID — the canonical resolver for /[locale]/[city]/[slug]-[code].
 * Resolving by code (not slug text) means a later slug correction never
 * breaks the URL — see db/views/010_public_schools.sql's school_code note.
 */
export async function getPublicSchoolByCode(code: number): Promise<{
  school: PublicSchool;
  board: PublicSchoolBoard | null;
  identifiers: PublicSchoolIdentifier[];
  facts: PublicSchoolFact[];
} | null> {
  const api = createApiSchemaClient();
  const publicClient = createPublicClient();

  const { data: schoolRow, error } = await api
    .from("public_schools")
    .select("*")
    .eq("school_code", code)
    .maybeSingle();
  if (error || !schoolRow) return null;
  const school = publicSchoolContract.parse(schoolRow);

  const [boardResult, identifiersResult, factsResult] = await Promise.all([
    api.from("public_school_boards").select("*").eq("school_id", school.id).maybeSingle(),
    publicClient.from("school_identifiers").select("scheme, value").eq("school_id", school.id),
    publicClient
      .from("field_provenance")
      .select("field, value, source_id, evidence_url, created_at, verified_at")
      .eq("entity_table", "schools")
      .eq("entity_id", school.id),
  ]);

  return {
    school,
    board: boardResult.data ? publicSchoolBoardContract.parse(boardResult.data) : null,
    identifiers: identifiersResult.data ?? [],
    facts: factsResult.data ?? [],
  };
}

/**
 * A school's own canonical path, resolved from just its id — for callers (the
 * teacher profile page, the /for-schools claim flow) that hold a school_id/row
 * but aren't already scoped to one city the way the browse pages are. Null if
 * the school or its city can't be resolved.
 */
export async function getSchoolCanonicalPath(
  schoolId: string,
  locale: string,
): Promise<string | null> {
  const result = await getPublicSchoolByIdSlug(schoolId);
  if (!result) return null;
  const { school } = result;
  if (!school.district_id) return null;
  const city = await getPublicCityByDistrictId(school.district_id);
  if (!city) return null;
  return schoolPath(locale, city.slug, school);
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
 * Kept in sync with db/views/040_public_areas.sql's `is_launch` list — the launch
 * set lives in SQL (and here), never in a table. Update both together.
 *
 * Jaipur and Gurugram are the launch districts (Gurugram added for city-picker
 * testing — 534 schools already in the DB from the original bulk import).
 * South West Delhi stays fully built (data, routes, the Delhi Nursery Hub) but
 * unlinked — out of this set, not deleted.
 */
const LAUNCH_DISTRICT_SLUGS = new Set(["jaipur", "gurugram"]);

/**
 * Real Jaipur-district towns added by supabase/seeds/jaipur_school_assignment.sql
 * — ordinary `localities` rows, but rendered with the town page template ("Near
 * X") instead of the locality template. The list lives here, in this repo's
 * code — same pattern as LAUNCH_DISTRICT_SLUGS — kept in sync with the `is_town`
 * computation in db/views/050_public_localities.sql and 010_public_schools.sql.
 */
const TOWN_LOCALITY_SLUGS = new Set(["dudu", "tunga", "bassi", "kishangarh-renwal", "chomu"]);

export type PublicArea = {
  slug: string;
  name: string;
  state: string;
  school_count: number;
  is_launch: boolean;
};

/** Reads api.public_areas directly — that view already computes school_count and is_launch. */
export async function listPublicAreas(): Promise<PublicArea[]> {
  const api = createApiSchemaClient();
  const { data, error } = await api.from("public_areas").select("*");
  if (error || !data) return [];
  return data.map((row) => publicAreaContract.parse(row));
}

export async function getPublicAreaBySlug(slug: string): Promise<PublicArea | null> {
  const areas = await listPublicAreas();
  return areas.find((a) => a.slug === slug) ?? null;
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
  const fallback = launched[0]?.slug ?? "jaipur";
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

/** Published schools in a district, for the district listing page. Newest first. */
export async function listPublicSchoolsByDistrict(
  districtId: number,
  filters: {
    query?: string;
    boardId?: number;
    maxClass?: string;
    admissionsOpen?: boolean;
    page?: number;
    pageSize?: number;
  } = {},
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

  let query = api
    .from("public_schools")
    .select("*", { count: "exact" })
    .eq("district_id", districtId);

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
    // api.public_school_admissions, not raw admission_cycles — also gets the
    // approval-verification gate that view already enforces, which this raw
    // query never did.
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

export type PublicDistrictFilterOptions = { boards: PublicBoard[]; maxClasses: string[] };

/** Only the boards and grade ranges actually present in this district — never a dead dropdown option. */
export async function listDistrictFilterOptions(
  districtId: number,
): Promise<PublicDistrictFilterOptions> {
  const api = createApiSchemaClient();

  const { data: schools } = await api
    .from("public_schools")
    .select("id, max_class")
    .eq("district_id", districtId);

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
  districtId: number,
  limit = 3,
): Promise<PublicOpenAdmission[]> {
  const api = createApiSchemaClient();

  const { data: schools } = await api
    .from("public_schools")
    .select("id, slug, school_code, name_en")
    .eq("district_id", districtId);

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
 * Soonest approved admission_cycles.closes_on per school, for list-card
 * DeadlineMargin rails. Only verification IN ('ops_verified','school_verified')
 * cycles are considered (api.public_school_admissions' own gate) — this used to
 * read raw admission_cycles with no approval filter at all; switching to the
 * view is a real correctness fix, not just a grants workaround.
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
  cityId: number;
  /** Internal only — never render this or its slug/name. Needed to scope the "all schools" query. */
  districtId: number;
  stateSlug: string;
  stateName: string;
  schoolCount: number;
  isLaunch: boolean;
};

/**
 * City bundled with its (internal-only) district's launch flag and its state —
 * everything a city page needs, with "district" never surfacing past this
 * function. school_count is district-wide (every published school in the
 * launched area, whether or not it has a resolved locality yet) — a school
 * pending /ops locality assignment still belongs on the city's "all schools"
 * listing; only locality/town pages are scoped to city_id/locality_id.
 */
export async function getPublicCityAreaBySlug(citySlug: string): Promise<PublicCityArea | null> {
  const api = createApiSchemaClient();
  const city = await getPublicCityBySlug(citySlug);
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

  const { count } = await api
    .from("public_schools")
    .select("id", { count: "exact", head: true })
    .eq("district_id", district.id);

  return {
    citySlug: city.slug,
    cityName: titleCase(city.name_en),
    cityId: city.id,
    districtId: district.id,
    stateSlug: slugify(state.name_en),
    stateName: state.name_en,
    schoolCount: count ?? 0,
    isLaunch: LAUNCH_DISTRICT_SLUGS.has(district.slug),
  };
}

export type PublicTownArea = {
  townSlug: string;
  townName: string;
  localityId: number;
  cityId: number;
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

  return {
    townSlug: locality.slug,
    townName: locality.name,
    localityId: locality.id,
    cityId: city.id,
    stateSlug: slugify(state.name_en),
    stateName: state.name_en,
    schoolCount: locality.school_count,
    isLaunch: LAUNCH_DISTRICT_SLUGS.has(district.slug),
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

/** Published schools assigned to one locality/town, for the locality page's school list. */
export async function listPublicSchoolsByLocality(localityId: number): Promise<PublicSchool[]> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_schools").select("*").eq("locality_id", localityId);
  return (data ?? []).map((row) => publicSchoolContract.parse(row));
}

/** Schools by id, for the Compare page — order is not guaranteed to match `ids`, callers re-sort if needed. */
export async function listPublicSchoolsByIds(ids: string[]): Promise<PublicSchool[]> {
  if (ids.length === 0) return [];
  const api = createApiSchemaClient();
  const { data } = await api.from("public_schools").select("*").in("id", ids);
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
