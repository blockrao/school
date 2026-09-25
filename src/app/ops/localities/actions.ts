"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

export async function assignLocality(formData: FormData) {
  const schoolId = String(formData.get("schoolId") ?? "");
  const localityId = String(formData.get("localityId") ?? "");
  const note = String(formData.get("note") ?? "");

  const supabase = await requireStaff();

  await supabase
    .from("schools")
    .update({
      locality_id: Number(localityId),
      locality_assignment_method: "staff",
      locality_assignment_note: note || null,
    })
    .eq("id", schoolId);

  redirect("/ops/localities");
}
