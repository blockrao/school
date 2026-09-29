import "server-only";
import { createPublicClient } from "@/lib/db/public";
import type { Json } from "@/lib/db/types";

/**
 * Minimum analytics (Activity & Admissions Consolidation, P1.8) — logs into
 * the append-only `analytics_events` table added by
 * 20260929090000_activity_admissions_v1.sql. Deliberately not a platform:
 * one insert helper, no queues, no batching, no client SDK. `event_type` is
 * a free-text column by design (see that migration), so this list is the
 * set this increment wires up, not a hard schema constraint — a later
 * increment can add event types without a migration.
 *
 * Event types wired up by this increment:
 *  - "page_view"            — a News/Events/Jobs canonical page or the
 *                              /admissions aggregator was viewed
 *  - "share"                — the share bar was used (metadata.method:
 *                              "whatsapp" | "copy_link" | "native")
 *  - "admission_lead_submit" — a parent submitted the on-site admission
 *                              enquiry form (existing submitAdmissionLead)
 *  - "admission_external_click" — a parent followed "Apply on school's
 *                              official website" instead
 *  - "listing_requested"    — a school requested a site-wide listing for a
 *                              post/event/job (existing request* actions)
 *  - "listing_reviewed"     — ops approved or rejected a listing
 *                              (metadata.decision: "approved" | "rejected")
 *
 * Called two ways:
 *  - directly, from Server Components and Server Actions (page views,
 *    lead submits, listing requests/reviews) — no network hop.
 *  - via POST /api/track, from the client-side ShareBar (a share is a user
 *    gesture with no server round-trip otherwise).
 * Both paths end up here so there is exactly one insert shape to reason
 * about. Uses the anon-key public client — analytics_events' RLS allows
 * anonymous insert (write-only telemetry), same as an anonymous parent
 * viewing a public page.
 */
export type AnalyticsEventType =
  | "page_view"
  | "share"
  | "admission_lead_submit"
  | "admission_external_click"
  | "listing_requested"
  | "listing_reviewed";

export interface LogAnalyticsEventInput {
  eventType: AnalyticsEventType;
  entityType?: string;
  entityId?: string;
  schoolId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget by design: analytics must never break the page or action
 * it's attached to. Errors are swallowed after a console.error — there is
 * no queue to retry into, and a dropped telemetry row is an acceptable
 * failure mode for "is this being used" reporting.
 */
export async function logAnalyticsEvent(input: LogAnalyticsEventInput): Promise<void> {
  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("analytics_events").insert({
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      school_id: input.schoolId ?? null,
      metadata: (input.metadata as Json | undefined) ?? null,
    });
    if (error) {
      console.error("logAnalyticsEvent failed:", error.message);
    }
  } catch (err) {
    console.error("logAnalyticsEvent threw:", err);
  }
}
