import { z } from "zod";
import { jobEmploymentTypeContract } from "@/contracts/public-school-jobs";

/** Mirrors db/views/105_public_jobs.sql — api.public_jobs (site-wide /jobs aggregator). */
export const publicJobContract = z.object({
  id: z.string(),
  school_id: z.string(),
  school_slug: z.string(),
  school_name: z.string(),
  city_id: z.number().nullable(),
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
  closes_at: z.string().nullable(),
  created_at: z.string(),
  listing_reviewed_at: z.string().nullable(),
});

export type PublicJob = z.infer<typeof publicJobContract>;
