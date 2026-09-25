import { z } from "zod";

/** Mirrors db/views/045_reference_views.sql — api.public_districts. Internal use only, never rendered. */
export const publicDistrictContract = z.object({
  id: z.number(),
  name_en: z.string(),
  slug: z.string(),
  state_id: z.number(),
});
export type PublicDistrictRow = z.infer<typeof publicDistrictContract>;

/** Mirrors db/views/045_reference_views.sql — api.public_states. */
export const publicStateContract = z.object({
  id: z.number(),
  name_en: z.string(),
  code: z.string(),
});
export type PublicStateRow = z.infer<typeof publicStateContract>;

/** Mirrors db/views/045_reference_views.sql — api.public_cities. */
export const publicCityContract = z.object({
  id: z.number(),
  name_en: z.string(),
  slug: z.string(),
  district_id: z.number(),
});
export type PublicCityRow = z.infer<typeof publicCityContract>;

/** Mirrors db/views/045_reference_views.sql — api.public_boards. */
export const publicBoardContract = z.object({
  id: z.number(),
  name_en: z.string(),
});
export type PublicBoardRow = z.infer<typeof publicBoardContract>;

/** Mirrors db/views/045_reference_views.sql — api.public_school_affiliations. */
export const publicSchoolAffiliationContract = z.object({
  school_id: z.string(),
  board_id: z.number(),
});
export type PublicSchoolAffiliationRow = z.infer<typeof publicSchoolAffiliationContract>;
