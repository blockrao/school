import { z } from "zod";

/** Mirrors db/views/040_public_areas.sql — api.public_areas. */
export const publicAreaContract = z.object({
  district_id: z.number(),
  slug: z.string(),
  name: z.string(),
  state: z.string(),
  school_count: z.number(),
  is_launch: z.boolean(),
  state_slug: z.string(),
  /** Every district this area covers: one for ordinary cities, all of them for a city-state (D-126). */
  district_ids: z.array(z.number()),
  is_city_state: z.boolean(),
});

export type PublicArea = z.infer<typeof publicAreaContract>;
