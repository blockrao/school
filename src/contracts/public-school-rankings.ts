import { z } from "zod";

/** Mirrors db/views/090_public_school_rankings.sql — api.public_school_rankings. */
export const publicSchoolRankingContract = z.object({
  category: z.string(),
  rank: z.number().nullable(),
  score: z.coerce.number().nullable(),
  year: z.number(),
  id: z.string(),
  slug: z.string(),
  school_code: z.number(),
  name_en: z.string().nullable(),
  locality_name: z.string().nullable(),
  city_slug: z.string(),
});

export type PublicSchoolRanking = z.infer<typeof publicSchoolRankingContract>;
