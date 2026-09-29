"use server";

import { redirect } from "next/navigation";
import { logAnalyticsEvent } from "@/lib/analytics";
import { requireStaff } from "@/lib/db/ops";

/** Gates an event into the site-wide /events aggregator — see db/views/103_public_events.sql. */
export async function approveEventListing(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const { supabase, user } = await requireStaff();

  const { data: event } = await supabase
    .from("school_events")
    .select("school_id")
    .eq("id", eventId)
    .maybeSingle();

  await supabase
    .from("school_events")
    .update({
      listing_review: "approved",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", eventId);

  await logAnalyticsEvent({
    eventType: "listing_reviewed",
    entityType: "event",
    entityId: eventId,
    schoolId: event?.school_id,
    metadata: { decision: "approved" },
  });

  redirect("/ops/events");
}

/** P1.5: requires a reason — see rejectPostListing's comment (same pattern, this table). */
export async function rejectEventListing(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const { supabase, user } = await requireStaff();

  const { data: event } = await supabase
    .from("school_events")
    .select("school_id")
    .eq("id", eventId)
    .maybeSingle();

  await supabase
    .from("school_events")
    .update({
      listing_review: "rejected",
      listing_reviewed_by: user?.id,
      listing_reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", eventId);

  await logAnalyticsEvent({
    eventType: "listing_reviewed",
    entityType: "event",
    entityId: eventId,
    schoolId: event?.school_id,
    metadata: { decision: "rejected" },
  });

  redirect("/ops/events");
}
