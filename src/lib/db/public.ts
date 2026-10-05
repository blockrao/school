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
      global: { fetch: cachedPublicFetch },
    },
  );
}

/**
 * Seconds a public read is served from Next's shared Data Cache before the next
 * request refetches it. Matches the `revalidate = 900` already declared on the
 * public page routes, so data is never staler than the pages that show it.
 */
export const PUBLIC_READ_REVALIDATE_SECONDS = 900;

/** Tag on every cached public read; `revalidateTag("public-api")` flushes them all. */
export const PUBLIC_API_CACHE_TAG = "public-api";

/**
 * GET/HEAD reads of the api.* views go through Next's Data Cache, shared
 * across requests and serverless instances.
 *
 * Why: React's cache() (used by listPublicAreas etc.) only memoizes within ONE
 * request. Pages that read cookies()/searchParams render per request, so every
 * visit re-ran the same reference queries (areas, boards, featured placements,
 * the school list) against Supabase. On 4-5 Oct 2026 that was ~355k PostgREST
 * calls/day from ~4 real users and pushed the project past the free-plan
 * egress and log-ingestion quotas. Cached here, identical queries hit
 * Supabase at most once per window instead of once per page view.
 *
 * Only safe/idempotent methods are cached; anything else passes through.
 * The anon key is the only credential on these requests, so the cache never
 * mixes per-user data.
 */
const cachedPublicFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "GET" && method !== "HEAD") return fetch(input, init);
  return fetch(input, {
    ...init,
    next: { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_API_CACHE_TAG] },
  });
};
