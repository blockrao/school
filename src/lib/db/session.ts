import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";

export type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
};

/**
 * Verifies the session's JWT locally against a cached JWKS (`getClaims()`)
 * instead of round-tripping to the Auth server on every call (`getUser()` —
 * by Supabase's own design, always network-bound, since it exists to let you
 * re-verify identity against an untrusted session store; `getClaims()` is
 * the newer, cheaper option once the project uses asymmetric JWT signing
 * keys, which this one does). Every caller in this app only reads
 * id/email/phone off the auth user, so this returns that same shape — drop
 * this in wherever `const { data: { user } } = await supabase.auth.getUser()`
 * used to be.
 */
export async function getSessionUser(
  supabase: SupabaseClient<Database>,
): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return {
    id: claims.sub,
    email: claims.email ?? null,
    phone: claims.phone ?? null,
  };
}

/**
 * Cookie-backed client for authenticated routes only: /my, /portal, /ops.
 * Public pages must not use this — they use public.ts instead.
 * Create a new client per request; never share one across requests.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies — the
            // middleware handles session refresh in that case instead.
          }
        },
      },
    },
  );
}
