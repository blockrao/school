import { z } from "zod";

/** Mirrors db/views/020_public_school_admissions.sql — api.public_school_admissions. */
export const publicSchoolAdmissionContract = z.object({
  school_id: z.string(),
  slug: z.string(),
  city_id: z.number().nullable(),
  name_en: z.string().nullable(),
  name_hi: z.string().nullable(),
  tier: z.string(),
  academic_year: z.string(),
  class_code: z.string(),
  status: z.string(),
  form_mode: z.string(),
  opens_on: z.string().nullable(),
  closes_on: z.string().nullable(),
  // registration_fee is numeric(10,2) — PostgREST returns it as a string.
  registration_fee: z.coerce.number().nullable(),
  form_url: z.string().nullable(),
  last_checked_at: z.string().nullable(),
  verification: z.string(),
  days_to_close: z.number().nullable(),
});

export type PublicSchoolAdmission = z.infer<typeof publicSchoolAdmissionContract>;
