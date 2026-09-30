import { z } from "zod";

/** Mirrors db/views/107_public_featured_placements.sql — api.public_featured_placements.
 * The view's own `where current_date between starts_on and ends_on` means every row this
 * contract ever parses is already live today — callers don't need to re-check the window. */
export const publicFeaturedPlacementContract = z.object({
  id: z.string(),
  placement: z.string(),
  class_codes: z.array(z.string()),
  label: z.string(),
  starts_on: z.string(),
  ends_on: z.string(),
  school_id: z.string(),
  slug: z.string(),
  school_code: z.number(),
  name_en: z.string().nullable(),
  city_slug: z.string(),
});

export type PublicFeaturedPlacement = z.infer<typeof publicFeaturedPlacementContract>;
