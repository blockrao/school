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
  // Increment 10 — appended, not inserted, to match the view's actual column order
  // (Postgres requires new `create or replace view` columns after the last existing
  // one; see db/views/020_public_school_admissions.sql's header).
  dob_from: z.string().nullable(),
  dob_to: z.string().nullable(),
  documents_required: z.array(z.string()),
  // 29 Sep 2026 — appended for the admission-leads CTA (20260929070000_admission_leads.sql),
  // which needs a real cycle id to record which class/session a lead applies to.
  cycle_id: z.string(),
  // 29 Sep 2026 (Activity & Admissions Consolidation) — appended for the
  // site-wide /admissions discovery page (city filter + display), which
  // reuses this view unfiltered rather than a new admissions data model.
  city_slug: z.string().nullable(),
  city_name: z.string().nullable(),
});

export type PublicSchoolAdmission = z.infer<typeof publicSchoolAdmissionContract>;
