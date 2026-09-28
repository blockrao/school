"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";

/**
 * Client Component Supabase client. Originally scoped to /my, /portal, /ops;
 * also used by AuthStatusLink (every page) and ClaimStatusLink (the public
 * entity page) to resolve personalized state client-side without forcing a
 * static/ISR page to render dynamically — see AuthStatusLink's doc comment.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
