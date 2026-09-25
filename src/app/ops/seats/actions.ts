"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

export async function confirmSeatStatus(formData: FormData) {
  const seatId = String(formData.get("seatId") ?? "");
  const supabase = await requireStaff();

  await supabase
    .from("seat_status")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", seatId);

  redirect("/ops/seats");
}

export async function rejectSeatStatus(formData: FormData) {
  const seatId = String(formData.get("seatId") ?? "");
  const supabase = await requireStaff();

  await supabase.from("seat_status").delete().eq("id", seatId);

  redirect("/ops/seats");
}
