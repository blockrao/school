"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

export async function resolveCorrection(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const { supabase } = await requireStaff();

  await supabase
    .from("correction_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", requestId);

  redirect("/ops/corrections");
}
