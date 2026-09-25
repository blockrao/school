import "server-only";
import { createPublicClient } from "@/lib/db/public";
import { parseGeographyPoint } from "@/lib/geo";
import { slugify } from "@/lib/slug";
import { titleCase } from "@/lib/text";

/**
 * Every public-facing data read in the app goes through this file — no page or
 * component queries Supabase directly. See scripts/check-public-adapter-imports.mjs
 * (CI-enforced) for the rule.
 *
 * TODO(views): once docs/handoff/db-agent-requests.md's public_schools /
 * public_school_facts / public_districts views exist and are granted to anon, swap
 * the base-table `.from(...)` calls below for the views. Callers don't change —
 * that's the whole point of routing everything through one file.
 *
 * Known gap until the DB agent applies that handoff: `school_identifiers` and
 * `field_provenance` currently have staff-only RLS policies with no public-read
 * variant, so `identifiers`/`facts` below return empty for anon today regardless of
 * a school's published status. Not a bug in this file — nothing to query yet.
 */

const SCHOOL_COLUMNS =
  "id, slug, name_en, name_hi, management, gender, medium, min_class, max_class, address, pincode, location, geocode_precision, website, phone, email, established_year, tier, verification, claim, last_verified_at, about_en, about_hi, district_id, city_id, locality_id";

export type PublicSchool = {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  management: string | null;
  gender: string | null;
  medium: string[] | null;
  min_class: string | null;
  max_class: string | null;
  address: string | null;
  pincode: string | null;
  location: unknown | null;
  geocode_precision: string | null;
  website: string | null;
  phone: string[] | null;
  email: string[] | null;
  established_year: number | null;
  tier: string;
  verification: string;
  claim: string;
  last_verified_at: string | null;
  about_en: string | null;
  about_hi: string | null;
  district_id: number | null;
  city_id: number | null;
  locality_id: number | null;
};

export type PublicSchoolAffiliation = {
  board_id: number;
  affiliation_no: string | null;
  level: string | null;
  valid_from: string | null;
  valid_to: string | null;
};

export type PublicSchoolIdentifier = { scheme: string; value: string };

export type PublicSchoolFact = {
  field: string;
  value: unknown;
  source_id: number | null;
  evidence_url: string | null;
  created_at: string;
  verified_at: string | null;
};

/** Overview page data for one school. Null if not found or not published. */
export async function getPublicSchoolByIdSlug(id: string): Promise<{
  school: PublicSchool;
  affiliations: PublicSchoolAffiliation[];
  identifiers: PublicSchoolIdentifier[];
  facts: PublicSchoolFact[];
} | null> {
  const supabase = createPublicClient();

  const { data: school, error } = await supabase
    .from("schools")
    .select(SCHOOL_COLUMNS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !school) return null;

  const [affiliationsResult, identifiersResult, factsResult] = await Promise.all([
    supabase
      .from("school_affiliations")
      .select("board_id, affiliation_no, level, valid_from, valid_to")
      .eq("school_id", id),
    supabase.from("school_identifiers").select("scheme, value").eq("school_id", id),
    supabase
      .from("field_provenance")
      .select("field, value, source_id, evidence_url, created_at, verified_at")
      .eq("entity_table", "schools")
      .eq("entity_id", id),
  ]);

  return {
    school,
    affiliations: affiliationsResult.data ?? [],
    identifiers: identifiersResult.data ?? [],
    facts: factsResult.data ?? [],
  };
}

export type PublicDistrict = { id: number; name_en: string; slug: string; state_id: number };

/** District row by slug, for the district listing page and breadcrumbs. */
export async function getPublicDistrictBySlug(slug: string): Promise<PublicDistrict | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("districts")
    .select("id, name_en, slug, state_id")
    .eq("slug", slug)
    .maybeSingle();
  return error || !data ? null : data;
}

export type PublicState = { id: number; name_en: string; code: string };

export async function getPublicStateById(id: number): Promise<PublicState | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("states")
    .select("id, name_en, code")
    .eq("id", id)
    .maybeSingle();
  return error || !data ? null : data;
}

/** No slug column on states — there are only a handful of rows, so slugify and match in JS. */
export async function getPublicStateBySlug(slug: string): Promise<PublicState | null> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("states").select("id, name_en, code");
  return (data ?? []).find((s) => slugify(s.name_en) === slug) ?? null;
}

/**
 * Kept in sync with db/views/040_public_areas.sql's `is_launch` list — the launch
 * set lives in SQL (and here), never in a table. Update both together.
 *
 * Jaipur is the launch district. South West Delhi stays fully built (data,
 * routes, the Delhi Nursery Hub) but unlinked — out of this set, not deleted.
 */
const LAUNCH_DISTRICT_SLUGS = new Set(["jaipur"]);

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

/**
 * Mirrors api.public_areas (districts joined to states, with a published-school
 * count and the launch flag from LAUNCH_DISTRICT_SLUGS). Raw-table sourced until
 * db/views/040_public_areas.sql is applied and this reads it directly.
 */
export async function listPublicAreas(): Promise<PublicArea[]> {
  const supabase = createPublicClient();

  const { data: districts } = await supabase
    .from("districts")
    .select("id, slug, name_en, state_id");
  if (!districts || districts.length === 0) return [];

  const stateIds = [...new Set(districts.map((d) => d.state_id))];
  const { data: states } = await supabase.from("states").select("id, name_en").in("id", stateIds);
  const stateNameById = new Map((states ?? []).map((s) => [s.id, s.name_en]));

  const districtIds = districts.map((d) => d.id);
  const { data: schools } = await supabase
    .from("schools")
    .select("district_id")
    .eq("status", "published")
    .in("district_id", districtIds);

  const countByDistrictId = new Map<number, number>();
  for (const row of schools ?? []) {
    if (row.district_id == null) continue;
    countByDistrictId.set(row.district_id, (countByDistrictId.get(row.district_id) ?? 0) + 1);
  }

  return districts.map((d) => ({
    slug: d.slug,
    name: titleCase(d.name_en),
    state: stateNameById.get(d.state_id) ?? "",
    school_count: countByDistrictId.get(d.id) ?? 0,
    is_launch: LAUNCH_DISTRICT_SLUGS.has(d.slug),
  }));
}

export async function getPublicAreaBySlug(slug: string): Promise<PublicArea | null> {
  const areas = await listPublicAreas();
  return areas.find((a) => a.slug === slug) ?? null;
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
  const supabase = createPublicClient();

  let query = supabase
    .from("schools")
    .select(SCHOOL_COLUMNS, { count: "exact" })
    .eq("district_id", districtId)
    .eq("status", "published");

  if (searchQuery) {
    query = query.ilike("name_en", `%${searchQuery}%`);
  }

  if (maxClass) {
    query = query.eq("max_class", maxClass);
  }

  if (boardId) {
    const { data: affiliated } = await supabase
      .from("school_affiliations")
      .select("school_id")
      .eq("board_id", boardId);
    const ids = (affiliated ?? []).map((a) => a.school_id);
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  if (admissionsOpen) {
    const { data: cycles } = await supabase
      .from("admission_cycles")
      .select("school_id")
      .in("status", ["open", "closing_soon"]);
    const ids = (cycles ?? []).map((c) => c.school_id);
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const from = (page - 1) * pageSize;
  const { data, count } = await query.range(from, from + pageSize - 1);

  return { schools: data ?? [], total: count ?? 0 };
}

export type PublicDistrictFilterOptions = { boards: PublicBoard[]; maxClasses: string[] };

/** Only the boards and grade ranges actually present in this district — never a dead dropdown option. */
export async function listDistrictFilterOptions(
  districtId: number,
): Promise<PublicDistrictFilterOptions> {
  const supabase = createPublicClient();

  const { data: schools } = await supabase
    .from("schools")
    .select("id, max_class")
    .eq("district_id", districtId)
    .eq("status", "published");

  const schoolIds = (schools ?? []).map((s) => s.id);
  const maxClasses = [...new Set((schools ?? []).map((s) => s.max_class).filter((v) => v != null))];

  if (schoolIds.length === 0) return { boards: [], maxClasses };

  const { data: affiliations } = await supabase
    .from("school_affiliations")
    .select("board_id")
    .in("school_id", schoolIds);
  const boardIds = [...new Set((affiliations ?? []).map((a) => a.board_id))];
  if (boardIds.length === 0) return { boards: [], maxClasses };

  const { data: boards } = await supabase.from("boards").select("id, name_en").in("id", boardIds);
  return { boards: boards ?? [], maxClasses };
}

export type PublicBoard = { id: number; name_en: string };

export async function listPublicBoards(): Promise<PublicBoard[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("boards").select("id, name_en");
  return data ?? [];
}

export type PublicOpenAdmission = {
  schoolId: string;
  slug: string;
  nameEn: string;
  status: string;
  closesOn: string | null;
};

/** Published schools in a district with a currently-open admission cycle, soonest deadline first. */
export async function listOpenAdmissionsByDistrict(
  districtId: number,
  limit = 3,
): Promise<PublicOpenAdmission[]> {
  const supabase = createPublicClient();

  const { data: schools } = await supabase
    .from("schools")
    .select("id, slug, name_en")
    .eq("district_id", districtId)
    .eq("status", "published");

  const schoolIds = (schools ?? []).map((s) => s.id);
  if (schoolIds.length === 0) return [];

  const { data: cycles } = await supabase
    .from("admission_cycles")
    .select("school_id, status, closes_on")
    .in("school_id", schoolIds)
    .in("status", ["open", "closing_soon"])
    .order("closes_on", { ascending: true })
    .limit(limit);

  const bySchoolId = new Map((schools ?? []).map((s) => [s.id, s]));
  return (cycles ?? []).flatMap((cycle) => {
    const school = bySchoolId.get(cycle.school_id);
    if (!school) return [];
    return [
      {
        schoolId: school.id,
        slug: school.slug,
        nameEn: school.name_en,
        status: cycle.status,
        closesOn: cycle.closes_on,
      },
    ];
  });
}

/** One board name per school (first affiliation), for list-card meta lines. Empty map entries are omitted, not guessed. */
export async function getBoardNamesBySchoolId(schoolIds: string[]): Promise<Map<string, string>> {
  if (schoolIds.length === 0) return new Map();

  const supabase = createPublicClient();
  const { data: affiliations } = await supabase
    .from("school_affiliations")
    .select("school_id, board_id")
    .in("school_id", schoolIds);

  const boardIds = [...new Set((affiliations ?? []).map((a) => a.board_id))];
  if (boardIds.length === 0) return new Map();

  const { data: boards } = await supabase.from("boards").select("id, name_en").in("id", boardIds);
  const boardNameById = new Map((boards ?? []).map((b) => [b.id, b.name_en]));

  const result = new Map<string, string>();
  for (const row of affiliations ?? []) {
    const boardName = boardNameById.get(row.board_id);
    if (boardName && !result.has(row.school_id)) {
      result.set(row.school_id, boardName);
    }
  }
  return result;
}

/** Soonest admission_cycles.closes_on per school, any status — for list-card DeadlineMargin rails. */
export async function getAdmissionDeadlinesBySchoolId(
  schoolIds: string[],
): Promise<Map<string, string | null>> {
  if (schoolIds.length === 0) return new Map();

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("admission_cycles")
    .select("school_id, closes_on")
    .in("school_id", schoolIds)
    .order("closes_on", { ascending: true });

  const result = new Map<string, string | null>();
  for (const row of data ?? []) {
    if (!result.has(row.school_id)) {
      result.set(row.school_id, row.closes_on);
    }
  }
  return result;
}

export type PublicCity = { id: number; name_en: string; slug: string; districtId: number };

export async function getPublicCityBySlug(slug: string): Promise<PublicCity | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("cities")
    .select("id, name_en, slug, district_id")
    .eq("slug", slug)
    .maybeSingle();
  return data
    ? { id: data.id, name_en: data.name_en, slug: data.slug, districtId: data.district_id }
    : null;
}

/** The city inside a district — used to resolve locality/town pages nested under a district route. */
export async function getPublicCityByDistrictId(districtId: number): Promise<PublicCity | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("cities")
    .select("id, name_en, slug, district_id")
    .eq("district_id", districtId)
    .maybeSingle();
  return data
    ? { id: data.id, name_en: data.name_en, slug: data.slug, districtId: data.district_id }
    : null;
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

async function schoolCountsByLocalityId(
  supabase: ReturnType<typeof createPublicClient>,
  localityIds: number[],
): Promise<Map<number, number>> {
  if (localityIds.length === 0) return new Map();
  const { data } = await supabase
    .from("schools")
    .select("locality_id")
    .eq("status", "published")
    .in("locality_id", localityIds);
  const counts = new Map<number, number>();
  for (const row of data ?? []) {
    if (row.locality_id == null) continue;
    counts.set(row.locality_id, (counts.get(row.locality_id) ?? 0) + 1);
  }
  return counts;
}

function toPublicLocality(
  row: {
    id: number;
    slug: string;
    name_en: string;
    name_hi: string | null;
    name_hi_status: string;
    centroid: unknown;
  },
  schoolCount: number,
): PublicLocality {
  const point = parseGeographyPoint(row.centroid);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name_en,
    nameHi: row.name_hi_status === "verified" ? row.name_hi : null,
    isTown: TOWN_LOCALITY_SLUGS.has(row.slug),
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    schoolCount,
  };
}

/** Locality/town row by slug within a city, for locality and town pages. Null if not found, superseded, or inactive. */
export async function getPublicLocalityBySlug(
  cityId: number,
  localitySlug: string,
): Promise<PublicLocality | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("localities")
    .select("id, slug, name_en, name_hi, name_hi_status, centroid")
    .eq("city_id", cityId)
    .eq("slug", localitySlug)
    .eq("status", "active")
    .is("superseded_by_corridor_id", null)
    .maybeSingle();
  if (!data) return null;

  const counts = await schoolCountsByLocalityId(supabase, [data.id]);
  return toPublicLocality(data, counts.get(data.id) ?? 0);
}

/**
 * Localities/towns in a city with at least `minSchools` published schools — the
 * locality index only lists places with enough schools to be worth a page,
 * per the Jaipur pivot instruction.
 */
export async function listPublicLocalitiesByCity(
  cityId: number,
  minSchools = 3,
): Promise<PublicLocality[]> {
  const supabase = createPublicClient();
  const { data: localities } = await supabase
    .from("localities")
    .select("id, slug, name_en, name_hi, name_hi_status, centroid")
    .eq("city_id", cityId)
    .eq("status", "active")
    .is("superseded_by_corridor_id", null);
  if (!localities || localities.length === 0) return [];

  const counts = await schoolCountsByLocalityId(
    supabase,
    localities.map((l) => l.id),
  );

  return localities
    .map((l) => toPublicLocality(l, counts.get(l.id) ?? 0))
    .filter((l) => l.schoolCount >= minSchools)
    .sort((a, b) => b.schoolCount - a.schoolCount);
}

/** Published schools assigned to one locality/town, for the locality page's school list. */
export async function listPublicSchoolsByLocality(localityId: number): Promise<PublicSchool[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("schools")
    .select(SCHOOL_COLUMNS)
    .eq("locality_id", localityId)
    .eq("status", "published");
  return data ?? [];
}

export type PublicLocalityNeighbor = { slug: string; name: string; method: "source" | "computed" };

/** Neighbouring localities for a locality page's "Nearby" section, nearest first. */
export async function listLocalityNeighbors(localityId: number): Promise<PublicLocalityNeighbor[]> {
  const supabase = createPublicClient();
  const { data: neighbors } = await supabase
    .from("locality_neighbors")
    .select("neighbor_locality_id, distance_meters, method")
    .eq("locality_id", localityId)
    .order("distance_meters", { ascending: true, nullsFirst: false });
  if (!neighbors || neighbors.length === 0) return [];

  const neighborIds = neighbors.map((n) => n.neighbor_locality_id);
  const { data: localities } = await supabase
    .from("localities")
    .select("id, slug, name_en")
    .in("id", neighborIds)
    .eq("status", "active")
    .is("superseded_by_corridor_id", null);
  const bySlugId = new Map((localities ?? []).map((l) => [l.id, l]));

  return neighbors.flatMap((n) => {
    const locality = bySlugId.get(n.neighbor_locality_id);
    if (!locality) return [];
    return [
      { slug: locality.slug, name: locality.name_en, method: n.method as "source" | "computed" },
    ];
  });
}
