import { z } from "zod";

/** Mirrors db/views/060_public_corridors.sql — api.public_corridors. */
export const publicCorridorContract = z.object({
  // corridors.id is bigint — PostgREST returns it as a numeric string, not a number.
  id: z.coerce.number(),
  slug: z.string(),
  name: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export type PublicCorridor = z.infer<typeof publicCorridorContract>;
