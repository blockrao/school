import { z } from "zod";

/** Mirrors db/views/080_public_teachers.sql — api.public_teachers. */
export const publicTeacherContract = z.object({
  id: z.string(),
  slug: z.string(),
  full_name: z.string(),
  subject: z.string().nullable(),
  level: z.string().nullable(),
  primary_school_id: z.string().nullable(),
  primary_school_name: z.string().nullable(),
  primary_school_slug: z.string().nullable(),
  locality_id: z.number().nullable(),
  locality_slug: z.string().nullable(),
  locality_name: z.string().nullable(),
  headline: z.string().nullable(),
  about: z.string().nullable(),
  years_teaching: z.number().nullable(),
  open_to: z.array(z.string()),
  photo_storage_path: z.string().nullable(),
  created_at: z.string(),
  /** Permanent public teacher ID (D-125); teachers.slug ends in it. */
  teacher_code: z.number(),
});

export type PublicTeacher = z.infer<typeof publicTeacherContract>;

/** Mirrors db/views/080_public_teachers.sql — api.public_teacher_experience. */
export const publicTeacherExperienceContract = z.object({
  id: z.string(),
  teacher_id: z.string(),
  role_title: z.string(),
  school_id: z.string().nullable(),
  school_name: z.string().nullable(),
  school_text: z.string().nullable(),
  start_year: z.number(),
  end_year: z.number().nullable(),
  sort_order: z.number(),
});

export type PublicTeacherExperience = z.infer<typeof publicTeacherExperienceContract>;

/** Mirrors db/views/080_public_teachers.sql — api.public_teacher_qualifications. */
export const publicTeacherQualificationContract = z.object({
  id: z.string(),
  teacher_id: z.string(),
  title: z.string(),
  detail: z.string().nullable(),
  verified: z.boolean(),
});

export type PublicTeacherQualification = z.infer<typeof publicTeacherQualificationContract>;
