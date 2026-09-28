import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    REVALIDATE_SECRET: z.string().min(1),
    // Selects the payment provider — see src/lib/payments/provider.ts. Defaults to
    // "manual" (the production-safe choice: never auto-confirms a payment) so a
    // missing env var fails safe rather than silently enabling the dev-only mock.
    PAYMENT_PROVIDER: z.enum(["mock", "manual", "razorpay"]).default("manual"),
    // Connection string for the payments_service Postgres role (EXECUTE on
    // mark_order_paid only — see supabase/migrations/20260925102635_payments_service_role.sql).
    // Optional at the schema level so its absence doesn't break unrelated pages;
    // src/lib/db/payments-role.ts checks for it itself and fails clearly there.
    DATABASE_URL_PAYMENTS: z.string().optional(),
    // Set by Vercel at build/runtime — "production" | "preview" | "development".
    // Unset locally, which we treat as safe (never blocks mock in local dev).
    VERCEL_ENV: z.string().optional(),
    // Vercel's own system env var — the project's production *.vercel.app domain,
    // no config needed. Used as a fallback origin (see `siteUrl` below) when
    // NEXT_PUBLIC_SITE_URL isn't set — i.e. Preview deployments.
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    // The canonical production origin — see src/lib/env.ts for the full note.
    // Read directly here too (NEXT_PUBLIC_* vars are readable server-side, they're
    // just *also* exposed to the client) so `siteUrl` doesn't need to import the
    // public env module for one field.
    NEXT_PUBLIC_SITE_URL: z.string().optional(),
  })
  .refine((env) => !(env.PAYMENT_PROVIDER === "mock" && env.VERCEL_ENV === "production"), {
    message: "PAYMENT_PROVIDER=mock is never allowed when VERCEL_ENV=production.",
    path: ["PAYMENT_PROVIDER"],
  });

/** Server-only. Importing this file from a Client Component fails the build. */
export const serverEnv = serverEnvSchema.parse({
  REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  DATABASE_URL_PAYMENTS: process.env.DATABASE_URL_PAYMENTS,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

/** Absolute canonical origin, for every URL that must be absolute (metadataBase,
 * JSON-LD, sitemap entries, the robots.txt `sitemap` directive). Prefers the
 * real domain (NEXT_PUBLIC_SITE_URL, Production only) so canonical/JSON-LD/
 * sitemap output always points at the production host regardless of which
 * deployment renders the request; falls back to Vercel's own production
 * *.vercel.app domain, then localhost, for Preview/local. */
export const siteUrl = serverEnv.NEXT_PUBLIC_SITE_URL
  ? serverEnv.NEXT_PUBLIC_SITE_URL
  : serverEnv.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${serverEnv.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";
