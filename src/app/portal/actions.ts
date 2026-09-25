"use server";

import { redirect } from "next/navigation";
import { getMySchoolId, listClassLevels } from "@/lib/db/portal";
import { createSessionClient } from "@/lib/db/session";

type SeatStatus = "open" | "limited" | "waitlist" | "closed";
const SEAT_STATUSES: readonly SeatStatus[] = ["open", "limited", "waitlist", "closed"];

function isSeatStatus(value: unknown): value is SeatStatus {
  return typeof value === "string" && (SEAT_STATUSES as readonly string[]).includes(value);
}

export async function updateSeatStatus(formData: FormData) {
  const academicYear = String(formData.get("academicYear") ?? "");

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const supabase = await createSessionClient();
  const classLevels = await listClassLevels();

  for (const level of classLevels) {
    const status = formData.get(`status_${level.code}`);
    if (!isSeatStatus(status)) continue;
    const rangeLabel = formData.get(`count_${level.code}`);

    await supabase.from("seat_status").insert({
      school_id: schoolId,
      academic_year: academicYear,
      class_code: level.code,
      public_status: status,
      range_label: typeof rangeLabel === "string" && rangeLabel.trim() ? rangeLabel.trim() : null,
      confidence: "reported",
      reported_via: "school_portal",
    });
  }

  redirect("/portal");
}
