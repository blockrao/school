import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // The canonical production origin (https://schooloye.com) — set in Vercel
  // for the Production environment only. Optional so Preview/local builds (which
  // don't set it) still succeed; src/lib/env.server.ts's `siteUrl` falls back to
  // Vercel's own per-deployment URL when this is unset.
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

/** Safe to import from client code — NEXT_PUBLIC_* vars, inlined at build time. */
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
