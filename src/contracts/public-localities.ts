import { z } from "zod";

/** Mirrors db/views/050_public_localities.sql — api.public_localities. */
export const publicLocalityContract = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  name_hi: z.string().nullable(),
  city_slug: z.string(),
  parent_locality_slug: z.string().nullable(),
  is_town: z.boolean(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  school_count: z.number(),
});

export type PublicLocality = z.infer<typeof publicLocalityContract>;
