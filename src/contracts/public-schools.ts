import { z } from "zod";

/** Mirrors db/views/010_public_schools.sql — api.public_schools. */
export const publicSchoolContract = z.object({
  id: z.string(),
  slug: z.string(),
  district_id: z.number().nullable(),
  city_id: z.number().nullable(),
  locality_id: z.number().nullable(),
  name_en: z.string().nullable(),
  name_hi: z.string().nullable(),
  management: z.string().nullable(),
  gender: z.string().nullable(),
  medium: z.array(z.string()).nullable(),
  min_class: z.string().nullable(),
  max_class: z.string().nullable(),
  address: z.string().nullable(),
  pincode: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  geocode_precision: z.string().nullable(),
  website: z.string().nullable(),
  phone: z.array(z.string()).nullable(),
  email: z.array(z.string()).nullable(),
  established_year: z.number().nullable(),
  tier: z.string(),
  verification: z.string(),
  claim: z.string(),
  last_verified_at: z.string().nullable(),
  about_en: z.string().nullable(),
  about_hi: z.string().nullable(),
});

export type PublicSchool = z.infer<typeof publicSchoolContract>;
