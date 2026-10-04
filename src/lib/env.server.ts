import "server-only";
import { z } from "zod";
import { PRODUCTION_ORIGIN } from "./site-origin";

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
 * JSON-LD, sitemap entries, the robots.txt `sitemap` directive).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL if set (explicit override, any environment);
 *   2. in Production, PRODUCTION_ORIGIN — the real domain, hard-coded, so a
 *      missing env var can never again make production point at itself via
 *      Vercel's internal *.vercel.app alias;
 *   3. in Preview, Vercel's own *.vercel.app URL (previews are noindex'd by
 *      robots.ts / next.config.ts, so self-referential is correct there);
 *   4. localhost for local dev.
 *
 * Why (2) exists: found 4 Oct 2026 — production had no NEXT_PUBLIC_SITE_URL,
 * so every canonical tag, every sitemap <loc>, and robots.txt's `Sitemap:`
 * line on www.schooloye.com pointed at https://school-gold-psi.vercel.app.
 * Google was being told the canonical copy of the whole site lived on a
 * different host, which is a near-total indexing blocker and had nothing to
 * do with page content or data quality. An env var is one misconfiguration
 * away from recurring; a production default is not. */
export const siteUrl = serverEnv.NEXT_PUBLIC_SITE_URL
  ? serverEnv.NEXT_PUBLIC_SITE_URL
  : serverEnv.VERCEL_ENV === "production"
    ? PRODUCTION_ORIGIN
    : serverEnv.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${serverEnv.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000";
