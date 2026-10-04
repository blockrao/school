import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * URL hygiene + language routing for docs/spec/urls-and-routing.md (D-121).
 * Named `proxy`, not `middleware` (Next.js 16 file convention).
 *
 * Public URLs have no /en prefix: English lives at the root. The route tree
 * still lives under src/app/[locale]/…, so this proxy:
 *   1. normalises: uppercase → lowercase (301); trailing slashes are removed
 *      by Next itself (permanent redirect);
 *   2. /en and /en/{root}/… → 301 to the unprefixed canonical form (kept as a
 *      safety net for sign-in/email links; the old /{city}/… school and city
 *      addresses were never indexed and now 404, D-122);
 *   3. /hi/… → 404 until a page has a real Hindi translation (§6);
 *   4. every other public path → rewritten internally to /en/… (no redirect).
 * Then, on the narrow set of auth paths, refreshes the Supabase session.
 */

// First path segments of every route under src/app/[locale]/ that has a
// canonical, unprefixed public form. Anything else is not a public URL (404).
// Keep this in step with the directories under src/app/[locale]/ — a route
// that exists but is missing here is still served, but at EVERY spelling:
// /en/news/x and /NEWS/x render 200 instead of 301'ing to /news/x, i.e.
// duplicate URLs for the same page. Found 4 Oct 2026 for news/events/jobs,
// all three already listed in sitemap-site.xml. src/proxy.test.ts has a
// test that diffs this set against the filesystem so it can't drift again.
export const LOCALE_ROOTS: ReadonlySet<string> = new Set([
  "school",
  "schools",
  "teacher",
  "teachers",
  "exams",
  "events",
  "news",
  "jobs",
  "admissions",
  "alerts",
  "compare",
  "guides",
  "tools",
  "privacy",
  "terms",
  "my",
  "sign-in",
  "sign-up",
  "forgot-password",
  "reset-password",
  "onboarding",
]);

// Routes outside src/app/[locale] plus framework/crawler files: passed through untouched.
const NON_LOCALE_PREFIXES = ["/_next", "/api", "/auth", "/dev", "/ops", "/portal", "/for-schools"];
const NON_LOCALE_EXACT = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/llms.txt",
  "/manifest.webmanifest",
]);

function isNonLocale(pathname: string): boolean {
  if (NON_LOCALE_EXACT.has(pathname)) return true;
  if (/^\/sitemap[^/]*\.xml$/.test(pathname)) return true;
  if (/\.[a-z0-9]+$/i.test(pathname) && !pathname.endsWith("/index.md")) return true; // static files
  return NON_LOCALE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Paths (internal, /en/-prefixed form) where the Supabase auth cookie needs refreshing.
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

export type RouteDecision =
  | { type: "pass" }
  | { type: "redirect"; to: string }
  | { type: "rewrite"; to: string };

/**
 * Pure routing decision for a request path (unit-tested in src/proxy.test.ts).
 * Every non-canonical form reaches its canonical URL in ONE hop (D-121 §8).
 */
export function routeDecision(pathname: string): RouteDecision {
  if (isNonLocale(pathname)) return { type: "pass" };

  const path = pathname.toLowerCase();
  if (path === "/en") return { type: "redirect", to: "/" };
  if (path === "/hi" || path.startsWith("/hi/")) {
    // Most roots still have no Hindi content at all (§6): never RENDER
    // English content at a /hi/ URL for those. Google indexed
    // /hi/exams/aissee and /hi/exams/jnvst before this policy existed, and
    // real search traffic is landing on those URLs (reported 2026-09-28), so
    // a hard 404 there would discard that traffic and the search equity with
    // it — hence the 301-to-canonical fallback below rather than a 404.
    //
    // "exams" is the one root with a real, per-page Hindi-completeness gate
    // (see @/lib/i18n-completeness + src/app/[locale]/exams/[slug]/page.tsx,
    // wired 2026-09-30): that page itself checks whether every _hi field it
    // needs is filled in and either renders in Hindi or redirects to the
    // English canonical, so the blanket redirect here would be redundant
    // (and would incorrectly send even fully-translated exams back to
    // English) — pass those through to the app router instead of
    // intercepting them. Every other root is unchanged pending the same
    // per-page treatment.
    const hiRest = path === "/hi" ? "/" : path.slice(3);
    const hiFirst = hiRest.split("/")[1] ?? "";
    if (hiFirst === "exams") {
      return { type: "rewrite", to: `/hi${hiRest}` };
    }
    if (hiRest === "/" || LOCALE_ROOTS.has(hiFirst)) {
      return { type: "redirect", to: hiRest };
    }
    return { type: "rewrite", to: "/en/__untranslated" };
  }

  const rest = path.startsWith("/en/") ? path.slice(3) : path;
  const first = rest.split("/")[1] ?? "";
  const isCanonicalRoot = rest === "/" || LOCALE_ROOTS.has(first);

  if (isCanonicalRoot) {
    if (rest !== pathname) return { type: "redirect", to: rest }; // /en prefix and/or uppercase
    return { type: "rewrite", to: rest === "/" ? "/en" : `/en${rest}` };
  }
  // Unknown pattern → 404 (pre-D-121 addresses were never indexed and were removed, D-122).
  return { type: "rewrite", to: `/en${rest}` };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const decision = routeDecision(pathname);
  if (decision.type === "redirect") {
    const target = request.nextUrl.clone();
    target.pathname = decision.to;
    return NextResponse.redirect(target, 301);
  }
  const internalPath = decision.type === "rewrite" ? decision.to : null;

  const makeResponse = () => {
    if (internalPath === null || internalPath === pathname) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.rewrite(url, { request });
  };

  const routePath = internalPath ?? pathname;
  if (!AUTH_MATCH.some((re) => re.test(routePath))) return makeResponse();

  let response = makeResponse();
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
          response = makeResponse();
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  // Fail closed on /ops before any ops page renders (defence in depth; RLS is the real gate).
  if (pathname.startsWith("/ops") && !data?.claims) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
