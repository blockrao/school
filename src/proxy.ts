import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

// Mirrors the locale set in src/app/[locale]/layout.tsx — keep in sync.
const LOCALES = ["en", "hi"] as const;
const DEFAULT_LOCALE = "en";

// Top-level routes that live outside src/app/[locale] (api, auth, dev, ops,
// portal, for-schools — see src/app/) plus framework/crawler paths. None of
// these ever take a locale prefix, so they're exempt from the redirect below.
const NON_LOCALE_PREFIXES = ["/_next", "/api", "/auth", "/dev", "/ops", "/portal", "/for-schools"];
const NON_LOCALE_EXACT = new Set(["/", "/favicon.ico", "/robots.txt"]);

function needsLocaleRedirect(pathname: string): boolean {
  if (NON_LOCALE_EXACT.has(pathname)) return false; // "/" → src/app/page.tsx's own redirect("/en")
  if (/^\/sitemap.*\.xml$/.test(pathname)) return false; // already emitted as /en/... internally
  if (NON_LOCALE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }
  const firstSegment = pathname.split("/")[1];
  return !(LOCALES as readonly string[]).includes(firstSegment);
}

// Paths where the Supabase auth cookie actually needs refreshing / checking.
// Deliberately narrow: doing the Supabase round-trip on every public page
// (home, exams, schools, ...) would add real latency and load for no benefit.
const AUTH_MATCH = [
  /^\/[^/]+\/my(\/|$)/,
  /^\/[^/]+\/sign-in$/,
  /^\/[^/]+\/sign-up$/,
  /^\/[^/]+\/forgot-password$/,
  /^\/[^/]+\/reset-password$/,
  /^\/portal(\/|$)/,
  /^\/ops(\/|$)/,
  /^\/for-schools\/claim(\/|$)/,
];

function needsAuthCheck(pathname: string): boolean {
  return AUTH_MATCH.some((re) => re.test(pathname));
}

/**
 * Named `proxy`, not `middleware` — Next.js 16 renamed the file convention
 * (middleware.ts is deprecated). See node_modules/next/dist/docs/.../proxy.md.
 *
 * Two independent jobs, run in this order:
 *
 * 1. Locale redirect — any request whose first path segment isn't a known
 *    locale ("/exams/jnvst", an old external link, someone typing the URL by
 *    hand) gets redirected to the default locale. Without this,
 *    src/app/[locale]/layout.tsx receives "exams" as the locale param, fails
 *    its LOCALES check, and 404s — which is exactly what shipped as a live
 *    bug (bare /exams/jnvst and /exams/aissee both 404ing while the real,
 *    fully-built pages sat one path segment away at /en/exams/...).
 *    Cheap and pathname-only, so it runs before anything touches Supabase.
 *
 * 2. Supabase session refresh, scoped to AUTH_MATCH only. Also fails closed
 *    on /ops: redirects signed-out requests to sign-in before a single byte
 *    of an ops page renders. requireStaff() (src/lib/db/ops.ts) already does
 *    this per-page; this is a second, earlier layer so a future /ops page
 *    added without requireStaff() doesn't accidentally ship unauthenticated —
 *    defense in depth, not a replacement for the RLS policies that are the
 *    actual source of truth.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (needsLocaleRedirect(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    target.search = search;
    return NextResponse.redirect(target, 307);
  }

  if (!needsAuthCheck(pathname)) return NextResponse.next();

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

  if (pathname.startsWith("/ops") && !data?.claims) {
    const signInUrl = new URL("/en/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
