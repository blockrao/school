import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Service-role client — bypasses RLS entirely. Never import this from a Client
 * Component or a public-route Server Component; use public.ts or session.ts
 * instead. scripts/check-admin-imports.mjs (run in CI) fails the build if this
 * ever gets imported from a disallowed path.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false },
    },
  );
}
