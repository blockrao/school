import { z } from "zod";

/** Mirrors db/views/0??_public_exam_admissions.sql — api.public_exam_admissions. */
export const publicExamMilestoneContract = z.object({
  label_en: z.string(),
  label_hi: z.string().nullable(),
  detail_en: z.string().nullable(),
  detail_hi: z.string().nullable(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
});

export const publicExamAdmissionContract = z.object({
  exam_id: z.string(),
  slug: z.string(),
  name_en: z.string(),
  name_hi: z.string().nullable(),
  conducting_body: z.string().nullable(),
  official_site: z.string().nullable(),
  cycle_id: z.string(),
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
  milestones: z.array(publicExamMilestoneContract),
});

export type PublicExamMilestone = z.infer<typeof publicExamMilestoneContract>;
export type PublicExamAdmission = z.infer<typeof publicExamAdmissionContract>;
