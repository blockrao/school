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

export const publicExamFeeTierContract = z.object({
  category_label_en: z.string(),
  category_label_hi: z.string().nullable(),
  // numeric(10,2) — PostgREST returns it as a string.
  amount: z.coerce.number(),
});

export const publicExamReservationSplitContract = z.object({
  level: z.enum(["primary", "within_group", "special"]),
  group_label_en: z.string(),
  group_label_hi: z.string().nullable(),
  share_text: z.string(),
});

export const publicExamCentreContract = z.object({
  city_code: z.string(),
  city_name: z.string(),
  state: z.string(),
});

export const publicExamParticipatingSchoolContract = z.object({
  school_id: z.string().nullable(),
  name_en: z.string(),
  name_hi: z.string().nullable(),
  state: z.string(),
});

export const publicExamApplicationStepContract = z.object({
  title_en: z.string(),
  detail_en: z.string(),
});

export const publicExamCorrectionContract = z.object({
  item_en: z.string(),
  official_en: z.string(),
  often_published_en: z.string(),
});

export const publicExamAdmissionContract = z.object({
  exam_id: z.string(),
  slug: z.string(),
  name_en: z.string(),
  name_hi: z.string().nullable(),
  conducting_body: z.string().nullable(),
  official_site: z.string().nullable(),
  helpdesk_phone: z.string().nullable(),
  helpdesk_email: z.string().nullable(),
  info_site_url: z.string().nullable(),
  cycle_id: z.string(),
  academic_year: z.string(),
  class_code: z.string(),
  status: z.string(),
  form_mode: z.string(),
  opens_on: z.string().nullable(),
  closes_on: z.string().nullable(),
  // registration_fee / late_fee_amount are numeric(10,2) — PostgREST returns them as strings.
  registration_fee: z.coerce.number().nullable(),
  late_fee_amount: z.coerce.number().nullable(),
  form_url: z.string().nullable(),
  notice_url: z.string().nullable(),
  dob_from: z.string().nullable(),
  dob_to: z.string().nullable(),
  documents_required: z.array(z.string()).nullable(),
  eligibility_notes_en: z.string().nullable(),
  eligibility_notes_hi: z.string().nullable(),
  // pattern/syllabus are exam-specific free-form jsonb (shape varies by exam/class) —
  // rendered defensively on the page rather than parsed into a strict shape here.
  pattern: z.unknown().nullable(),
  syllabus: z.unknown().nullable(),
  application_steps: z.array(publicExamApplicationStepContract),
  corrections: z.array(publicExamCorrectionContract),
  last_checked_at: z.string().nullable(),
  verification: z.string(),
  days_to_close: z.number().nullable(),
  milestones: z.array(publicExamMilestoneContract),
  fee_tiers: z.array(publicExamFeeTierContract),
  reservation_splits: z.array(publicExamReservationSplitContract),
  centres: z.array(publicExamCentreContract),
  participating_schools: z.array(publicExamParticipatingSchoolContract),
});

export type PublicExamMilestone = z.infer<typeof publicExamMilestoneContract>;
export type PublicExamFeeTier = z.infer<typeof publicExamFeeTierContract>;
export type PublicExamReservationSplit = z.infer<typeof publicExamReservationSplitContract>;
export type PublicExamCentre = z.infer<typeof publicExamCentreContract>;
export type PublicExamParticipatingSchool = z.infer<typeof publicExamParticipatingSchoolContract>;
export type PublicExamApplicationStep = z.infer<typeof publicExamApplicationStepContract>;
export type PublicExamCorrection = z.infer<typeof publicExamCorrectionContract>;
export type PublicExamAdmission = z.infer<typeof publicExamAdmissionContract>;
