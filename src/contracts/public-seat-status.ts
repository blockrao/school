import { z } from "zod";

/** Mirrors db/views/030_public_seat_status.sql — api.public_seat_status. */
export const publicSeatStatusContract = z.object({
  school_id: z.string(),
  academic_year: z.string(),
  class_code: z.string(),
  public_status: z.string(),
  range_label: z.string().nullable(),
  confidence: z.string(),
  mid_session_accepted: z.boolean().nullable(),
  reported_at: z.string().nullable(),
  confirmed_at: z.string().nullable(),
});

export type PublicSeatStatus = z.infer<typeof publicSeatStatusContract>;
