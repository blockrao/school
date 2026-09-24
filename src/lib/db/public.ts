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
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false },
    },
  );
}
