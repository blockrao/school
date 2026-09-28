import "server-only";
import {
  type PublicTeacher,
  type PublicTeacherExperience,
  type PublicTeacherQualification,
  publicTeacherContract,
  publicTeacherExperienceContract,
  publicTeacherQualificationContract,
} from "@/contracts";
import { createApiSchemaClient } from "@/lib/db/public";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

export async function listPublicTeachers(
  filters: { subject?: string } = {},
): Promise<PublicTeacher[]> {
  const api = createApiSchemaClient();
  let query = api.from("public_teachers").select("*");
  if (filters.subject) query = query.eq("subject", filters.subject);
  const { data } = await query.order("full_name", { ascending: true });
  return (data ?? []).map((row) => publicTeacherContract.parse(row));
}

/** Published, claimed teacher profiles matching a name — for a school's "invite to team" search. */
export async function searchPublicTeachersByName(
  query: string,
  limit = 10,
): Promise<PublicTeacher[]> {
  if (!query.trim()) return [];
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_teachers")
    .select("*")
    .ilike("full_name", `%${query.trim()}%`)
    .limit(limit);
  return (data ?? []).map((row) => publicTeacherContract.parse(row));
}

export async function listPublicTeacherSubjects(): Promise<string[]> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_teachers").select("subject");
  const subjects = new Set(
    (data ?? []).map((row) => row.subject as string | null).filter((s): s is string => !!s),
  );
  return [...subjects].sort();
}

/** Canonical resolver for /teacher/{name}-{teacher_code} (D-125). */
export async function getPublicTeacherByCode(code: number): Promise<PublicTeacher | null> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_teachers")
    .select("*")
    .eq("teacher_code", code)
    .maybeSingle();
  return data ? publicTeacherContract.parse(data) : null;
}

export async function getPublicTeacherById(id: string): Promise<PublicTeacher | null> {
  const api = createApiSchemaClient();
  const { data } = await api.from("public_teachers").select("*").eq("id", id).maybeSingle();
  return data ? publicTeacherContract.parse(data) : null;
}

export async function listPublicTeacherExperience(
  teacherId: string,
): Promise<PublicTeacherExperience[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_teacher_experience")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("sort_order", { ascending: true })
    .order("start_year", { ascending: false });
  return (data ?? []).map((row) => publicTeacherExperienceContract.parse(row));
}

export async function listPublicTeacherQualifications(
  teacherId: string,
): Promise<PublicTeacherQualification[]> {
  const api = createApiSchemaClient();
  const { data } = await api
    .from("public_teacher_qualifications")
    .select("*")
    .eq("teacher_id", teacherId);
  return (data ?? []).map((row) => publicTeacherQualificationContract.parse(row));
}

/** The signed-in user's own teacher row (any status), for the create/manage flow. Uses the raw table via the session client, not the api view — the api view only ever shows published+listed rows. */
export async function getMyTeacherProfile() {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) return null;

  const { data } = await supabase
    .from("teachers")
    .select(
      "id, slug, full_name, subject, level, primary_school_id, locality_id, headline, about, years_teaching, open_to, is_listed, status",
    )
    .eq("claimed_by", user.id)
    .maybeSingle();
  return data;
}

export async function listMyTeacherExperience(teacherId: string) {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("teacher_experience")
    .select("id, role_title, school_id, school_text, start_year, end_year, sort_order")
    .eq("teacher_id", teacherId)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function listMyTeacherQualifications(teacherId: string) {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("teacher_qualifications")
    .select("id, title, detail, verified_at")
    .eq("teacher_id", teacherId);
  return data ?? [];
}
