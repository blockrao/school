import { z } from "zod";

/** Mirrors db/views/096_public_admission_updates.sql — api.public_admission_updates. */
export const publicAdmissionUpdateContract = z.object({
  audit_id: z.number(),
  cycle_id: z.string(),
  school_id: z.string(),
  school_slug: z.string(),
  school_name: z.string().nullable(),
  academic_year: z.string(),
  class_code: z.string(),
  change_type: z.enum(["created", "updated"]),
  occurred_at: z.string(),
  // V1 allowlist only — status/opens_on/closes_on/results_on. Adding a field here
  // requires the same explicit allowlist change in the view itself (see its header).
  changed_fields: z.array(z.enum(["status", "opens_on", "closes_on", "results_on"])),
  new_status: z.string().nullable(),
  new_opens_on: z.string().nullable(),
  new_closes_on: z.string().nullable(),
  new_results_on: z.string().nullable(),
});

export type PublicAdmissionUpdate = z.infer<typeof publicAdmissionUpdateContract>;
