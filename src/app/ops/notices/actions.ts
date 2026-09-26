"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

export async function approveNotice(formData: FormData) {
  const noticeId = String(formData.get("noticeId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("admission_notices")
    .update({ review: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq("id", noticeId);

  redirect("/ops/notices");
}

export async function rejectNotice(formData: FormData) {
  const noticeId = String(formData.get("noticeId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("admission_notices")
    .update({ review: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq("id", noticeId);

  redirect("/ops/notices");
}
