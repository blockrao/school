"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSchoolMember } from "@/lib/db/portal-auth";

export async function inviteTeacher(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const parsed = z.string().uuid().safeParse(teacherId);
  const { supabase, membership } = await requireSchoolMember();
  if (!parsed.success) redirect("/portal/team?error=invalid");

  // A teacher can only be invited if there's no live relationship already —
  // re-inviting after a decline/removal reuses the same row (unique
  // school_id+teacher_id) rather than erroring on a duplicate insert.
  const { data: existing } = await supabase
    .from("school_teacher_affiliations")
    .select("id, status")
    .eq("school_id", membership.schoolId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (existing && ["active", "pending_teacher", "pending_school"].includes(existing.status)) {
    redirect("/portal/team?error=already_pending");
  }

  if (existing) {
    await supabase
      .from("school_teacher_affiliations")
      .update({
        status: "pending_teacher",
        initiated_by: "school",
        requested_by: null,
        responded_by: null,
        responded_at: null,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("school_teacher_affiliations").insert({
      school_id: membership.schoolId,
      teacher_id: teacherId,
      status: "pending_teacher",
      initiated_by: "school",
    });
  }

  redirect("/portal/team?invited=1");
}

async function updateOwnAffiliation(
  affiliationId: string,
  requiredStatus: "pending_school",
  next: { status: "active" | "declined_by_school"; responded_at: string },
) {
  const { supabase, membership } = await requireSchoolMember();

  await supabase
    .from("school_teacher_affiliations")
    .update(next)
    .eq("id", affiliationId)
    .eq("school_id", membership.schoolId)
    .eq("status", requiredStatus);

  redirect("/portal/team");
}

export async function acceptTeacherRequest(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "");
  await updateOwnAffiliation(affiliationId, "pending_school", {
    status: "active",
    responded_at: new Date().toISOString(),
  });
}

export async function declineTeacherRequest(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "");
  await updateOwnAffiliation(affiliationId, "pending_school", {
    status: "declined_by_school",
    responded_at: new Date().toISOString(),
  });
}

export async function cancelInvite(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "");
  const { supabase, membership } = await requireSchoolMember();

  await supabase
    .from("school_teacher_affiliations")
    .update({ status: "removed" })
    .eq("id", affiliationId)
    .eq("school_id", membership.schoolId)
    .eq("status", "pending_teacher");

  redirect("/portal/team");
}

export async function removeTeamMember(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "");
  const { supabase, membership } = await requireSchoolMember();

  await supabase
    .from("school_teacher_affiliations")
    .update({ status: "removed" })
    .eq("id", affiliationId)
    .eq("school_id", membership.schoolId)
    .eq("status", "active");

  redirect("/portal/team");
}
