import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";

/**
 * Anon-key client for public pages — no cookies, no user session, just anon-key
 * reads subject to RLS. Use this in Server Components; public pages never query
 * Supabase from the browser. For /my, /portal, /ops (authenticated areas), use
 * session.ts instead.
 */
export function createPublicClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false },
    },
  );
}

/**
 * Anon-key client scoped to the `api` schema (db/views/*.sql) — same anon key,
 * same RLS exposure, just pointed at the curated views instead of `public`.
 * `scripts/gen-db-types.mjs` only introspects `public` (see its own header), so
 * `Database` has no `api` key to type this client against — deliberately
 * untyped here; every caller validates rows against the matching Zod contract in
 * src/contracts immediately after fetching (the same contracts
 * scripts/verify-views.ts checks against live data), so correctness is enforced
 * at runtime instead of compile time for this one client.
 */
export function createApiSchemaClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false },
      db: { schema: "api" },
    },
  );
}
