import "server-only";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { createSessionClient } from "@/lib/db/session";
import { schoolPath } from "@/lib/urls";

export type AffiliationRow = {
  id: string;
  schoolId: string;
  teacherId: string;
  status:
    | "pending_teacher"
    | "pending_school"
    | "active"
    | "declined_by_teacher"
    | "declined_by_school"
    | "removed";
  initiatedBy: "school" | "teacher";
  createdAt: string;
};

function mapRow(row: {
  id: string;
  school_id: string;
  teacher_id: string;
  status: string;
  initiated_by: string;
  created_at: string;
}): AffiliationRow {
  return {
    id: row.id,
    schoolId: row.school_id,
    teacherId: row.teacher_id,
    status: row.status as AffiliationRow["status"],
    initiatedBy: row.initiated_by as "school" | "teacher",
    createdAt: row.created_at,
  };
}

export type SchoolTeamView = {
  active: (AffiliationRow & { teacherName: string; teacherSlug: string; subject: string | null })[];
  invitesSent: (AffiliationRow & { teacherName: string; teacherSlug: string })[];
  requestsReceived: (AffiliationRow & { teacherName: string; teacherSlug: string })[];
};

/** Everything a school portal's team page needs — active roster + both pending directions. */
export async function listSchoolAffiliations(schoolId: string): Promise<SchoolTeamView> {
  const supabase = await createSessionClient();
  const { data: rows } = await supabase
    .from("school_teacher_affiliations")
    .select("id, school_id, teacher_id, status, initiated_by, created_at")
    .eq("school_id", schoolId)
    .in("status", ["active", "pending_teacher", "pending_school"])
    .order("created_at", { ascending: false });

  const teacherIds = [...new Set((rows ?? []).map((r) => r.teacher_id))];
  const teachers =
    teacherIds.length > 0
      ? (
          await supabase
            .from("teachers")
            .select("id, full_name, slug, subject")
            .in("id", teacherIds)
        ).data
      : [];
  const teacherById = new Map((teachers ?? []).map((t) => [t.id, t]));

  const active: SchoolTeamView["active"] = [];
  const invitesSent: SchoolTeamView["invitesSent"] = [];
  const requestsReceived: SchoolTeamView["requestsReceived"] = [];

  for (const raw of rows ?? []) {
    const row = mapRow(raw);
    const teacher = teacherById.get(row.teacherId);
    const teacherName = teacher?.full_name ?? "Teacher";
    const teacherSlug = teacher?.slug ?? "";
    if (row.status === "active") {
      active.push({ ...row, teacherName, teacherSlug, subject: teacher?.subject ?? null });
    } else if (row.status === "pending_teacher") {
      invitesSent.push({ ...row, teacherName, teacherSlug });
    } else if (row.status === "pending_school") {
      requestsReceived.push({ ...row, teacherName, teacherSlug });
    }
  }

  return { active, invitesSent, requestsReceived };
}

export type TeacherAffiliationsView = {
  active: (AffiliationRow & { schoolName: string })[];
  invitesReceived: (AffiliationRow & { schoolName: string })[];
  requestsSent: (AffiliationRow & { schoolName: string })[];
};

/** Everything a teacher's manage page needs for the "Schools" section. */
export async function listTeacherAffiliations(teacherId: string): Promise<TeacherAffiliationsView> {
  const supabase = await createSessionClient();
  const { data: rows } = await supabase
    .from("school_teacher_affiliations")
    .select("id, school_id, teacher_id, status, initiated_by, created_at")
    .eq("teacher_id", teacherId)
    .in("status", ["active", "pending_teacher", "pending_school"])
    .order("created_at", { ascending: false });

  const schoolIds = [...new Set((rows ?? []).map((r) => r.school_id))];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const nameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  const active: TeacherAffiliationsView["active"] = [];
  const invitesReceived: TeacherAffiliationsView["invitesReceived"] = [];
  const requestsSent: TeacherAffiliationsView["requestsSent"] = [];

  for (const raw of rows ?? []) {
    const row = mapRow(raw);
    const schoolName = nameById.get(row.schoolId) ?? "School";
    if (row.status === "active") {
      active.push({ ...row, schoolName });
    } else if (row.status === "pending_teacher") {
      invitesReceived.push({ ...row, schoolName });
    } else if (row.status === "pending_school") {
      requestsSent.push({ ...row, schoolName });
    }
  }

  return { active, invitesReceived, requestsSent };
}

export type PublicTeamMember = {
  teacherId: string;
  slug: string;
  fullName: string;
  subject: string | null;
  level: string | null;
  headline: string | null;
};

/**
 * A school's public "Our Teachers" list — active affiliations only, and only
 * for teachers who are still published + listed (an active affiliation
 * doesn't override the teacher's own visibility choice).
 */
export async function listPublicSchoolTeam(schoolId: string): Promise<PublicTeamMember[]> {
  const supabase = await createSessionClient();
  const { data: rows } = await supabase
    .from("school_teacher_affiliations")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .eq("status", "active");

  const teacherIds = [...new Set((rows ?? []).map((r) => r.teacher_id))];
  if (teacherIds.length === 0) return [];

  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, slug, full_name, subject, level, headline")
    .in("id", teacherIds)
    .eq("status", "published")
    .eq("is_listed", true);

  return (teachers ?? []).map((t) => ({
    teacherId: t.id,
    slug: t.slug,
    fullName: t.full_name,
    subject: t.subject,
    level: t.level,
    headline: t.headline,
  }));
}

export type VerifiedSchool = { schoolId: string; schoolName: string; path: string | null };

/**
 * Active school affiliations for a teacher's own public profile — "Verified
 * at". Resolves each school's canonical path in exactly two extra queries
 * total (schools by id, then cities by district id — the same batched
 * two-query shape `getCitiesByDistrictIds` already exists for, used by
 * Compare/saved-schools), never one `getSchoolCanonicalPath` call per school.
 */
export async function listPublicTeacherSchools(
  teacherId: string,
  locale: string,
): Promise<VerifiedSchool[]> {
  const supabase = await createSessionClient();
  const { data: rows } = await supabase
    .from("school_teacher_affiliations")
    .select("school_id")
    .eq("teacher_id", teacherId)
    .eq("status", "active");

  const schoolIds = [...new Set((rows ?? []).map((r) => r.school_id))];
  if (schoolIds.length === 0) return [];

  const schools = await listPublicSchoolsByIds(schoolIds);
  return schools.map((s) => {
    return {
      schoolId: s.id,
      schoolName: s.name_en ?? "School",
      path: schoolPath(locale, s.slug),
    };
  });
}
