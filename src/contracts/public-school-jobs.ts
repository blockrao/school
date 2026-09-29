import { z } from "zod";

export const jobEmploymentTypeContract = z.enum(["full_time", "part_time", "contract", "visiting"]);
export type JobEmploymentType = z.infer<typeof jobEmploymentTypeContract>;

const listingReviewContract = z
  .enum(["pending", "approved", "edited", "rejected", "needs_triage"])
  .nullable();

/** Mirrors db/views/104_public_school_jobs.sql — api.public_school_jobs (own-page feed). */
export const publicSchoolJobContract = z.object({
  id: z.string(),
  school_id: z.string(),
  school_slug: z.string(),
  job_code: z.number(),
  job_slug: z.string(),
  title: z.string(),
  employment_type: jobEmploymentTypeContract,
  subject: z.string().nullable(),
  description: z.string(),
  experience_required: z.string().nullable(),
  salary_range: z.string().nullable(),
  location: z.string().nullable(),
  apply_url: z.string().nullable(),
  apply_email: z.string().nullable(),
  class_codes: z.array(z.string()),
  closes_at: z.string().nullable(),
  filled_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  listing_requested_at: z.string().nullable(),
  listing_review: listingReviewContract,
  created_at: z.string(),
});

export type PublicSchoolJob = z.infer<typeof publicSchoolJobContract>;
