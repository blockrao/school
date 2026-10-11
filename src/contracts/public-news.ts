import { z } from "zod";
import { postTierContract } from "@/contracts/public-school-news";

/** Mirrors db/views/101_public_news.sql — api.public_news (site-wide /news aggregator). */
export const publicNewsContract = z.object({
  id: z.string(),
  school_id: z.string(),
  school_slug: z.string(),
  school_name: z.string(),
  city_id: z.number().nullable(),
  kind: z.enum(["news", "press"]),
  title: z.string(),
  body: z.string(),
  source_url: z.string().nullable(),
  published_at: z.string(),
  post_code: z.number(),
  post_slug: z.string(),
  tier: postTierContract,
  listing_reviewed_at: z.string().nullable(),
  topic: z.enum(["general", "admission_announcement"]),
  admission_academic_year: z.string().nullable(),
  admission_class_codes: z.array(z.string()),
  admission_opens_on: z.string().nullable(),
  admission_closes_on: z.string().nullable(),
  admission_application_url: z.string().nullable(),
  admission_notice_url: z.string().nullable(),
});

export type PublicNews = z.infer<typeof publicNewsContract>;
