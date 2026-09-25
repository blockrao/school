"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

export async function approveClaim(formData: FormData) {
  const claimId = String(formData.get("claimId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const supabase = await requireStaff();
  const {
    data: { user: staffUser },
  } = await supabase.auth.getUser();

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

  await supabase.from("schools").update({ claim: "claimed" }).eq("id", schoolId);

  redirect("/ops/claims");
}

export async function rejectClaim(formData: FormData) {
  const claimId = String(formData.get("claimId") ?? "");

  const supabase = await requireStaff();
  const {
    data: { user: staffUser },
  } = await supabase.auth.getUser();

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
