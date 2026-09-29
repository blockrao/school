import { z } from "zod";

/** Mirrors db/views/106_public_field_evidence.sql — api.public_field_evidence. */
export const publicFieldEvidenceContract = z.object({
  school_id: z.string(),
  field: z.string(),
  evidence_url: z.string().nullable(),
  created_at: z.string(),
  source_name: z.string(),
  source_base_url: z.string().nullable(),
});

export type PublicFieldEvidence = z.infer<typeof publicFieldEvidenceContract>;
