import { z } from "zod";

/** Mirrors db/views/070_public_locality_neighbors.sql — api.public_locality_neighbors. */
export const publicLocalityNeighborContract = z.object({
  locality_slug: z.string(),
  neighbor_slug: z.string(),
  neighbor_name: z.string(),
  // distance_meters is numeric — PostgREST returns it as a string.
  distance_meters: z.coerce.number().nullable(),
  method: z.enum(["source", "computed"]),
});

export type PublicLocalityNeighbor = z.infer<typeof publicLocalityNeighborContract>;
