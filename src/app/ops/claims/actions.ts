"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

export async function approveClaim(formData: FormData) {
  const claimId = String(formData.get("claimId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const { supabase, user: staffUser } = await requireStaff();

  await supabase
    .from("school_claims")
    .update({
      status: "claimed",
      reviewed_by: staffUser?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  await supabase
    .from("school_members")
    .insert({ school_id: schoolId, user_id: userId, role: "admin" });

  // Deliberately does NOT touch verification/source_type/verification_status.
  // Checklist: "A claimed-but-unverified school's self-submitted facts get
  // source_type = school_reported, never auto-upgraded to schooloye_verified."
  // Claiming ownership proves who runs the school, not that its listed facts
  // are correct -- that only changes when staff actually reviews them via
  // updateSchool (src/app/ops/schools/[id]/actions.ts).
  await supabase.from("schools").update({ claim: "claimed" }).eq("id", schoolId);

  redirect("/ops/claims");
}

export async function rejectClaim(formData: FormData) {
  const claimId = String(formData.get("claimId") ?? "");

  const { supabase, user: staffUser } = await requireStaff();

  await supabase
    .from("school_claims")
    .update({
      status: "rejected",
      reviewed_by: staffUser?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  redirect("/ops/claims");
}
