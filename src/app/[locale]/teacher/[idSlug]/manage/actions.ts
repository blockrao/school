"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/db/session";

async function requireOwnedTeacher(teacherId: string) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("teachers")
    .select("id, slug")
    .eq("id", teacherId)
    .eq("claimed_by", user.id)
    .maybeSingle();
  return data ? { supabase, teacher: data } : null;
}

const experienceSchema = z.object({
  roleTitle: z.string().trim().min(1).max(120),
  schoolId: z.string().optional(),
  schoolText: z.string().trim().max(160).optional(),
  startYear: z.coerce.number().int().min(1970).max(2100),
  endYear: z.string().optional(),
});

export async function addExperience(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const idSlug = String(formData.get("idSlug") ?? "");
  const manageUrl = `/${formData.get("locale") ?? "en"}/teacher/${idSlug}/manage`;

  const owned = await requireOwnedTeacher(teacherId);
  if (!owned) redirect(manageUrl);

  const parsed = experienceSchema.safeParse({
    roleTitle: formData.get("roleTitle"),
    schoolId: formData.get("schoolId") || undefined,
    schoolText: formData.get("schoolText") || undefined,
    startYear: formData.get("startYear"),
    endYear: formData.get("endYear") || undefined,
  });
  if (!parsed.success) redirect(`${manageUrl}?error=invalid_experience`);

  await owned.supabase.from("teacher_experience").insert({
    teacher_id: teacherId,
    role_title: parsed.data.roleTitle,
    school_id: parsed.data.schoolId || null,
    school_text: parsed.data.schoolId ? null : (parsed.data.schoolText ?? null),
    start_year: parsed.data.startYear,
    end_year: parsed.data.endYear ? Number(parsed.data.endYear) : null,
  });

  redirect(manageUrl);
}

const qualificationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(200).optional(),
});

export async function addQualification(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const idSlug = String(formData.get("idSlug") ?? "");
  const manageUrl = `/${formData.get("locale") ?? "en"}/teacher/${idSlug}/manage`;

  const owned = await requireOwnedTeacher(teacherId);
  if (!owned) redirect(manageUrl);

  const parsed = qualificationSchema.safeParse({
    title: formData.get("title"),
    detail: formData.get("detail") || undefined,
  });
  if (!parsed.success) redirect(`${manageUrl}?error=invalid_qualification`);

  await owned.supabase.from("teacher_qualifications").insert({
    teacher_id: teacherId,
    title: parsed.data.title,
    detail: parsed.data.detail ?? null,
  });

  redirect(manageUrl);
}

export async function toggleListed(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const idSlug = String(formData.get("idSlug") ?? "");
  const isListed = formData.get("isListed") === "1";
  const manageUrl = `/${formData.get("locale") ?? "en"}/teacher/${idSlug}/manage`;

  const owned = await requireOwnedTeacher(teacherId);
  if (!owned) redirect(manageUrl);

  await owned.supabase.from("teachers").update({ is_listed: !isListed }).eq("id", teacherId);

  redirect(manageUrl);
}

export async function requestSchool(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const idSlug = String(formData.get("idSlug") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const manageUrl = `/${formData.get("locale") ?? "en"}/teacher/${idSlug}/manage`;

  const owned = await requireOwnedTeacher(teacherId);
  if (!owned) redirect(manageUrl);
  if (!z.string().uuid().safeParse(schoolId).success) redirect(`${manageUrl}?error=invalid_school`);

  const { data: existing } = await owned.supabase
    .from("school_teacher_affiliations")
    .select("id, status")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (existing && ["active", "pending_teacher", "pending_school"].includes(existing.status)) {
    redirect(`${manageUrl}?error=already_pending`);
  }

  if (existing) {
    await owned.supabase
      .from("school_teacher_affiliations")
      .update({
        status: "pending_school",
        initiated_by: "teacher",
        requested_by: null,
        responded_by: null,
        responded_at: null,
      })
      .eq("id", existing.id);
  } else {
    await owned.supabase.from("school_teacher_affiliations").insert({
      school_id: schoolId,
      teacher_id: teacherId,
      status: "pending_school",
      initiated_by: "teacher",
    });
  }

  redirect(`${manageUrl}?requested=1`);
}

async function respondToSchoolInvite(
  formData: FormData,
  next: { status: "active" | "declined_by_teacher"; responded_at: string },
) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const idSlug = String(formData.get("idSlug") ?? "");
  const affiliationId = String(formData.get("affiliationId") ?? "");
  const manageUrl = `/${formData.get("locale") ?? "en"}/teacher/${idSlug}/manage`;

  const owned = await requireOwnedTeacher(teacherId);
  if (!owned) redirect(manageUrl);

  await owned.supabase
    .from("school_teacher_affiliations")
    .update(next)
    .eq("id", affiliationId)
    .eq("teacher_id", teacherId)
    .eq("status", "pending_teacher");

  redirect(manageUrl);
}

export async function acceptSchoolInvite(formData: FormData) {
  await respondToSchoolInvite(formData, {
    status: "active",
    responded_at: new Date().toISOString(),
  });
}

export async function declineSchoolInvite(formData: FormData) {
  await respondToSchoolInvite(formData, {
    status: "declined_by_teacher",
    responded_at: new Date().toISOString(),
  });
}

export async function cancelSchoolRequest(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const idSlug = String(formData.get("idSlug") ?? "");
  const affiliationId = String(formData.get("affiliationId") ?? "");
  const manageUrl = `/${formData.get("locale") ?? "en"}/teacher/${idSlug}/manage`;

  const owned = await requireOwnedTeacher(teacherId);
  if (!owned) redirect(manageUrl);

  await owned.supabase
    .from("school_teacher_affiliations")
    .update({ status: "removed" })
    .eq("id", affiliationId)
    .eq("teacher_id", teacherId)
    .eq("status", "pending_school");

  redirect(manageUrl);
}

export async function leaveSchool(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const idSlug = String(formData.get("idSlug") ?? "");
  const affiliationId = String(formData.get("affiliationId") ?? "");
  const manageUrl = `/${formData.get("locale") ?? "en"}/teacher/${idSlug}/manage`;

  const owned = await requireOwnedTeacher(teacherId);
  if (!owned) redirect(manageUrl);

  await owned.supabase
    .from("school_teacher_affiliations")
    .update({ status: "removed" })
    .eq("id", affiliationId)
    .eq("teacher_id", teacherId)
    .eq("status", "active");

  redirect(manageUrl);
}
