import "server-only";
import { createPublicClient } from "@/lib/db/public";

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

/** Published schools in a district, for the district listing page. Newest first. */
export async function listPublicSchoolsByDistrict(
  districtId: number,
  filters: { boardId?: number; page?: number; pageSize?: number } = {},
): Promise<{ schools: PublicSchool[]; total: number }> {
  const { boardId, page = 1, pageSize = 24 } = filters;
  const supabase = createPublicClient();

  let query = supabase
    .from("schools")
    .select(SCHOOL_COLUMNS, { count: "exact" })
    .eq("district_id", districtId)
    .eq("status", "published");

  if (boardId) {
    const { data: affiliated } = await supabase
      .from("school_affiliations")
      .select("school_id")
      .eq("board_id", boardId);
    const ids = (affiliated ?? []).map((a) => a.school_id);
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const from = (page - 1) * pageSize;
  const { data, count } = await query.range(from, from + pageSize - 1);

  return { schools: data ?? [], total: count ?? 0 };
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
