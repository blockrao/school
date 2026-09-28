import { z } from "zod";

/** Mirrors db/views/010_public_schools.sql — api.public_schools. */
export const publicSchoolContract = z.object({
  id: z.string(),
  /** Internal 6-digit id — never in a URL or JSON-LD (D-121). */
  school_code: z.number(),
  /** Permanent public locator: /school/{slug}. Minted once, write-once (D-121). */
  slug: z.string(),
  district_id: z.number().nullable(),
  city_id: z.number().nullable(),
  locality_id: z.number().nullable(),
  locality_slug: z.string().nullable(),
  locality_name: z.string().nullable(),
  locality_is_town: z.boolean().nullable(),
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
  /** 'published' or 'closed' (closed schools stay live with a banner, D-121 §9). */
  status: z.string(),
  aliases: z.array(z.string()),
  state_slug: z.string().nullable(),
  city_slug: z.string().nullable(),
});

/** Mirrors db/views/015_public_school_redirects.sql — api.public_school_redirects. */
export const publicSchoolRedirectContract = z.object({
  from_slug: z.string(),
  from_code: z.number().nullable(),
  from_id: z.string().nullable(),
  to_slug: z.string(),
  kind: z.string(),
});

export type PublicSchoolRedirect = z.infer<typeof publicSchoolRedirectContract>;

export type PublicSchool = z.infer<typeof publicSchoolContract>;
