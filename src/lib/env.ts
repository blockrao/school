import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Optional explicit override of the canonical origin. Normally unset:
  // src/lib/env.server.ts's `siteUrl` already defaults to PRODUCTION_ORIGIN
  // (https://www.schooloye.com, src/lib/site-origin.ts) in Production and to
  // Vercel's per-deployment URL in Preview, so nothing depends on this being
  // configured in Vercel any more (it was unset there as of 4 Oct 2026, which
  // is how production ended up canonicalising to its *.vercel.app alias).
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

/** Safe to import from client code — NEXT_PUBLIC_* vars, inlined at build time. */
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
