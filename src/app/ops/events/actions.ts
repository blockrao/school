"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/db/ops";

/** Gates an event into the site-wide /events aggregator — see db/views/103_public_events.sql. */
export async function approveEventListing(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("school_events")
    .update({
      listing_review: "approved",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  redirect("/ops/events");
}

export async function rejectEventListing(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const { supabase, user } = await requireStaff();

  await supabase
    .from("school_events")
    .update({
      listing_review: "rejected",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  redirect("/ops/events");
}
