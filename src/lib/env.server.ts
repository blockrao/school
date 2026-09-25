import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  REVALIDATE_SECRET: z.string().min(1),
  // Launch-day switch — see docs/deploy.md. Defaults closed (not indexable) so a
  // missing env var fails safe: pre-launch, never indexed by accident.
  SITE_INDEXABLE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

/** Server-only. Importing this file from a Client Component fails the build. */
export const serverEnv = serverEnvSchema.parse({
  REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  SITE_INDEXABLE: process.env.SITE_INDEXABLE,
});
