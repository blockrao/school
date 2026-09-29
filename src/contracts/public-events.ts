import { z } from "zod";
import { schoolEventTypeContract } from "@/contracts/public-school-events";

/** Mirrors db/views/103_public_events.sql — api.public_events (site-wide /events aggregator). */
export const publicEventContract = z.object({
  id: z.string(),
  school_id: z.string(),
  school_slug: z.string(),
  school_name: z.string(),
  city_id: z.number().nullable(),
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
  listing_reviewed_at: z.string().nullable(),
});

export type PublicEvent = z.infer<typeof publicEventContract>;
