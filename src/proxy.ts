import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie for authenticated routes. Matched only to
 * /my, /portal, /ops — public pages never touch this.
 *
 * Named `proxy`, not `middleware` — Next.js 16 renamed the file convention
 * (middleware.ts is deprecated). See node_modules/next/dist/docs/.../proxy.md.
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

  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Routes are locale-prefixed (/[locale]/my/...), so the matcher needs the leading
  // segment too — a bare "/my/:path*" never matches "/en/my/...".
  matcher: [
    "/:locale/my/:path*",
    "/:locale/portal/:path*",
    "/:locale/ops/:path*",
    "/:locale/sign-in",
  ],
};
