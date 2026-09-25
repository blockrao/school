import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    REVALIDATE_SECRET: z.string().min(1),
    // Launch-day switch — see docs/deploy.md. Defaults closed (not indexable) so a
    // missing env var fails safe: pre-launch, never indexed by accident.
    SITE_INDEXABLE: z
      .string()
      .optional()
      .transform((value) => value === "true"),
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
  })
  .refine((env) => !(env.PAYMENT_PROVIDER === "mock" && env.VERCEL_ENV === "production"), {
    message: "PAYMENT_PROVIDER=mock is never allowed when VERCEL_ENV=production.",
    path: ["PAYMENT_PROVIDER"],
  });

/** Server-only. Importing this file from a Client Component fails the build. */
export const serverEnv = serverEnvSchema.parse({
  REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  SITE_INDEXABLE: process.env.SITE_INDEXABLE,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  DATABASE_URL_PAYMENTS: process.env.DATABASE_URL_PAYMENTS,
  VERCEL_ENV: process.env.VERCEL_ENV,
});
