"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSchoolMember } from "@/lib/db/portal-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const UNIQUE_VIOLATION = "23505";

export async function inviteTeacher(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const parsed = z.string().uuid().safeParse(teacherId);
  const { supabase, membership } = await requireSchoolMember();
  if (!parsed.success) redirect("/portal/team?error=invalid");

  const allowed = await checkRateLimit("invite_teacher", membership.schoolId, 50, 3600);
  if (!allowed) redirect("/portal/team?error=rate_limited");

  // The invite target must be a real, currently discoverable teacher profile
  // — the same published+listed population the team page's own search draws
  // from (teachers_public_read's RLS gate). This also re-checks freshness:
  // if the teacher unlisted themselves between the search and this submit,
  // the invite is rejected rather than silently creating a row nobody but
  // staff could ever see or act on.
  const { data: targetTeacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("status", "published")
    .eq("is_listed", true)
    .maybeSingle();
  if (!targetTeacher) redirect("/portal/team?error=teacher_not_found");

  // A teacher can only be invited if there's no live relationship already —
  // re-inviting after a decline/removal reuses the same row (unique
  // school_id+teacher_id) rather than erroring on a duplicate insert. The
  // check-then-write below has a race window (a concurrent request from the
  // teacher's side could insert between the read and the write here), so the
  // insert path also catches a unique-violation and treats it the same as
  // finding the row up front.
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
    const { data: updated, error } = await supabase
      .from("school_teacher_affiliations")
      .update({
        status: "pending_teacher",
        initiated_by: "school",
        requested_by: null,
        responded_by: null,
        responded_at: null,
      })
      .eq("id", existing.id)
      .select("id");
    if (error || !updated || updated.length === 0) redirect("/portal/team?error=already_pending");
  } else {
    const { error } = await supabase.from("school_teacher_affiliations").insert({
      school_id: membership.schoolId,
      teacher_id: teacherId,
      status: "pending_teacher",
      initiated_by: "school",
    });
    if (error) {
      redirect(
        error.code === UNIQUE_VIOLATION
          ? "/portal/team?error=already_pending"
          : "/portal/team?error=invite_failed",
      );
    }
  }

  redirect("/portal/team?invited=1");
}

/**
 * Applies a school's own response to a `pending_school` row (accept/decline).
 * The `.select("id")` on the update is what lets us tell a real state change
 * apart from a no-op: if the row already moved on (the teacher cancelled
 * their request a moment earlier, say), `requiredStatus` no longer matches
 * and RLS + the where-clause together return zero rows — that's reported to
 * the school as "stale" rather than a silent, misleading success.
 */
async function updateOwnAffiliation(
  affiliationId: string,
  requiredStatus: "pending_school",
  next: { status: "active" | "declined_by_school"; responded_at: string },
) {
  const { supabase, membership } = await requireSchoolMember();

  const { data: updated, error } = await supabase
    .from("school_teacher_affiliations")
    .update(next)
    .eq("id", affiliationId)
    .eq("school_id", membership.schoolId)
    .eq("status", requiredStatus)
    .select("id");

  redirect(error || !updated || updated.length === 0 ? "/portal/team?error=stale" : "/portal/team");
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

  const { data: updated, error } = await supabase
    .from("school_teacher_affiliations")
    .update({ status: "removed" })
    .eq("id", affiliationId)
    .eq("school_id", membership.schoolId)
    .eq("status", "pending_teacher")
    .select("id");

  redirect(error || !updated || updated.length === 0 ? "/portal/team?error=stale" : "/portal/team");
}

export async function removeTeamMember(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "");
  const { supabase, membership } = await requireSchoolMember();

  const { data: updated, error } = await supabase
    .from("school_teacher_affiliations")
    .update({ status: "removed" })
    .eq("id", affiliationId)
    .eq("school_id", membership.schoolId)
    .eq("status", "active")
    .select("id");

  redirect(error || !updated || updated.length === 0 ? "/portal/team?error=stale" : "/portal/team");
}
