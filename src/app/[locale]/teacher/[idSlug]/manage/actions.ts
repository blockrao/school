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
