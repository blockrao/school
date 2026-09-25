import { z } from "zod";

/** Mirrors db/views/040_public_cities.sql — api.public_cities. */
export const publicCityContract = z.object({
  id: z.number(),
  district_id: z.number(),
  name_en: z.string(),
  name_hi: z.string().nullable(),
  slug: z.string(),
});

export type PublicCity = z.infer<typeof publicCityContract>;
