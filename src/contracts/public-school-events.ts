import { z } from "zod";

export const schoolEventTypeContract = z.enum([
  "ptm",
  "open_house",
  "admission_test",
  "sports_day",
  "cultural",
  "workshop",
  "result_day",
  "holiday",
  "fee_deadline",
  "other",
]);
export type SchoolEventType = z.infer<typeof schoolEventTypeContract>;

const listingReviewContract = z
  .enum(["pending", "approved", "edited", "rejected", "needs_triage"])
  .nullable();

/** Mirrors db/views/102_public_school_events.sql — api.public_school_events (own-page feed). */
export const publicSchoolEventContract = z.object({
  id: z.string(),
  school_id: z.string(),
  school_slug: z.string(),
  event_code: z.number(),
  event_slug: z.string(),
  event_type: schoolEventTypeContract,
  title: z.string(),
  description: z.string().nullable(),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  location: z.string().nullable(),
  class_codes: z.array(z.string()),
  registration_url: z.string().nullable(),
  source_url: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  listing_requested_at: z.string().nullable(),
  listing_review: listingReviewContract,
  // Canonical Page Freshness & GEO Alignment v1 (29 Sep 2026) — when this
  // event was actually added, not when it's scheduled for (starts_at can be
  // months in the future). Needed by the school page's dateModified
  // projection; see 102_public_school_events.sql's header for why.
  created_at: z.string(),
});

export type PublicSchoolEvent = z.infer<typeof publicSchoolEventContract>;
