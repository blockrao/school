import { z } from "zod";

export const postTierContract = z.enum(["organic", "featured", "press_release"]);
export type PostTier = z.infer<typeof postTierContract>;

/** Mirrors db/views/095_public_school_news.sql — api.public_school_news. */
export const publicSchoolNewsContract = z.object({
  id: z.string(),
  school_id: z.string(),
  school_slug: z.string(),
  kind: z.enum(["news", "press"]),
  title: z.string(),
  body: z.string(),
  source_url: z.string().nullable(),
  published_at: z.string(),
  post_code: z.number(),
  post_slug: z.string(),
  tier: postTierContract,
  listing_requested_at: z.string().nullable(),
  // review_status has 5 values in the DB (also: edited, needs_triage) but this
  // domain only ever sets pending/approved/rejected for listing_review.
  listing_review: z.enum(["pending", "approved", "edited", "rejected", "needs_triage"]).nullable(),
});

export type PublicSchoolNews = z.infer<typeof publicSchoolNewsContract>;
