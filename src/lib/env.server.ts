import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  REVALIDATE_SECRET: z.string().min(1),
});

/** Server-only. Importing this file from a Client Component fails the build. */
export const serverEnv = serverEnvSchema.parse({
  REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
});
