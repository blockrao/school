import { z } from "zod";

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
});

export type PublicSchoolNews = z.infer<typeof publicSchoolNewsContract>;
