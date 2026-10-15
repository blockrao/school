import { z } from "zod";

/** Row of api.public_school_fees (db/views/112_public_school_fees.sql). */
export const publicSchoolFeeContract = z.object({
  fee_id: z.string(),
  school_id: z.string(),
  academic_year: z.string(),
  class_code: z.string().nullable(),
  fee_head: z.string().nullable(),
  component: z.string(),
  variant: z.string().nullable(),
  // numeric(10,2) comes back from PostgREST as a string.
  amount_min: z.coerce.number().nullable(),
  amount_max: z.coerce.number().nullable(),
  frequency: z.string().nullable(),
  mandatory: z.boolean().nullable(),
  refundable: z.boolean().nullable(),
  basis: z.string().nullable(),
  effective_from: z.string().nullable(),
  notes: z.string().nullable(),
  source_kind: z.string(),
  evidence_url: z.string().nullable(),
  observed_at: z.string().nullable(),
  valid_to: z.string().nullable(),
  updated_at: z.string(),
});

export type PublicSchoolFee = z.infer<typeof publicSchoolFeeContract>;
