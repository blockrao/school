import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Runs on every matched request (see `config.matcher` below).
 *
 * Two jobs, both defense-in-depth on top of the per-page checks that already
 * exist (requireStaff(), portal's getMySchoolId()) rather than a replacement
 * for them — the database's RLS policies remain the actual source of truth:
 *
 * 1. Refresh the Supabase auth session cookie on every request. Without this,
 *    a Server Component that can't set cookies (see session.ts's comment)
 *    never gets a refreshed access token, and long-idle sessions on /portal
 *    or /ops can silently start failing `auth.getUser()` mid-visit.
 * 2. Fail closed on /ops: redirect signed-out requests to sign-in before a
 *    single byte of an ops page is even rendered. requireStaff() already does
 *    this per-page; this catches it one layer earlier and is here specifically
 *    so a future /ops page added without requireStaff() doesn't accidentally
 *    ship unauthenticated. /portal deliberately isn't gated here — an
 *    unauthenticated visit there is meant to fall through to `/for-schools`,
 *    a marketing page, not a sign-in wall (see src/app/portal/page.tsx).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: this call must not be removed — it's what actually refreshes
  // the session and re-issues the cookie via setAll above. Do not replace
  // with getSession(), which reads the (possibly stale) cookie only.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/ops") && !user) {
    const signInUrl = new URL("/en/sign-in", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimization files,
     * so the session cookie stays fresh across ordinary page navigation
     * without doing pointless work on every JS/CSS chunk request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
