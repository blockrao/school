"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/db/ops";

/** Grants ops/admin access to an existing profile, found by email. Admin-only. */
export async function grantStaffRole(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "ops") as "ops" | "admin";
  if (!email) redirect("/ops/staff?error=missing_email");

  const supabase = await requireAdmin();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    redirect(`/ops/staff?error=not_found&email=${encodeURIComponent(email)}`);
  }

  await supabase.from("profiles").update({ role }).eq("user_id", profile.user_id);
  redirect("/ops/staff");
}

/** Demotes a staff member back to `parent`. Admin-only. Cannot demote yourself. */
export async function revokeStaffRole(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");

  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (userId === user?.id) {
    redirect("/ops/staff?error=self_revoke");
  }

  await supabase.from("profiles").update({ role: "parent" }).eq("user_id", userId);
  redirect("/ops/staff");
}
