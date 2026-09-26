import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie for authenticated routes. Matched only to
 * /my, /portal, /ops — public pages never touch this.
 *
 * Named `proxy`, not `middleware` — Next.js 16 renamed the file convention
 * (middleware.ts is deprecated). See node_modules/next/dist/docs/.../proxy.md.
 *
 * Also fails closed on /ops: redirects signed-out requests to sign-in before
 * a single byte of an ops page renders. requireStaff() (src/lib/db/ops.ts)
 * already does this per-page; this is a second, earlier layer so a future
 * /ops page added without requireStaff() doesn't accidentally ship
 * unauthenticated — defense in depth, not a replacement for the RLS
 * policies that are the actual source of truth.
 */
export async function proxy(request: NextRequest) {
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

  const { data } = await supabase.auth.getClaims();

  if (request.nextUrl.pathname.startsWith("/ops") && !data?.claims) {
    const signInUrl = new URL("/en/sign-in", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // /my and /sign-in are locale-prefixed (/[locale]/my/...) — the matcher needs
    // the leading segment too, a bare "/my/:path*" never matches "/en/my/...".
    "/:locale/my/:path*",
    "/:locale/sign-in",
    "/:locale/sign-up",
    "/:locale/forgot-password",
    "/:locale/reset-password",
    // /portal, /ops and /for-schools/claim are top-level, not locale-prefixed —
    // matches the header/footer links and docs/screen-map.md's own route table.
    "/portal/:path*",
    "/ops/:path*",
    "/for-schools/claim/:path*",
  ],
};
