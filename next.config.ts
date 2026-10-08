import type { NextConfig } from "next";
import { PRODUCTION_ORIGIN } from "./src/lib/site-origin";

// Read directly (not via env.server.ts): this file runs in plain Node, outside
// Next's react-server bundler condition, where the "server-only" import throws.
// Only Vercel Preview copies are kept out of search; production is always open.
const isPreview = process.env.VERCEL_ENV === "preview";

// OWASP secure-headers baseline. No third-party scripts/styles are loaded
// anywhere in this app today (checked: no GTM/Sentry/analytics tags), so the
// CSP can stay strict — 'unsafe-inline' is kept for style-src (Tailwind's
// inlined critical CSS needs it without a nonce-based setup) AND for
// script-src.
//
// script-src MUST allow inline execution: Next.js's own App Router runtime
// ships its RSC flight-data payload and hydration bootstrap as inline
// <script> tags on every page (this is not a third-party script, it's how
// React hydrates at all). Without 'unsafe-inline' here, the browser silently
// refuses every one of those inline scripts (CSP violation, logged to the
// console, not surfaced anywhere in the UI) and the page never hydrates —
// every Client Component's event handlers (CityPicker, MobileMenu's
// hamburger, the mobile bottom nav, etc.) go dead while the HTML still looks
// complete, which reads as "the button doesn't do anything" rather than an
// error. Found 2026-09-28 while chasing exactly that report.
//
// The properly strict fix is a per-request nonce generated in src/proxy.ts
// (script-src 'nonce-{value}' 'strict-dynamic') per Next's CSP guide
// (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md),
// but that requires every page under it to render dynamically — Next only
// applies a nonce during server-side rendering of a per-request CSP header,
// so static generation/ISR (which D-121's discovery/entity pages rely on for
// caching) is incompatible with it. Revisit as a deliberate architecture call
// if stricter script-src is ever required; don't flip this back without also
// solving that dynamic-rendering tradeoff.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Compression handled automatically by Vercel
  compress: true,
  async headers() {
    const cacheHeaders = [
      { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" },
    ];
    if (!isPreview) return [{ source: "/:path*", headers: [...securityHeaders, ...cacheHeaders] }];

    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...cacheHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    // One hostname (D-121 §11). apex <-> www is owned ONLY by Vercel's domain
    // settings (primary domain + redirect); doing it here as well caused a redirect
    // loop on 28 Sep when the two disagreed. The app only folds Vercel's own
    // *.vercel.app aliases onto the canonical host.
    //
    // Previews are excluded: a Preview deployment IS a *.vercel.app host and
    // must keep serving itself (it's noindex'd via headers() above). In
    // Production, every *.vercel.app alias of the deployment — not one
    // hard-coded name — redirects. Found 4 Oct 2026: this matched only
    // "school-ten-ivory.vercel.app" while the live production alias was
    // "school-gold-psi.vercel.app", so that alias served a full, indexable
    // duplicate of the site (and, with siteUrl mis-resolving, was declared the
    // canonical copy on every page). Matching the suffix closes the whole class.
    if (isPreview) return [];
    const canonicalHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN).host;
    return [
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "(?<alias>.*)\\.vercel\\.app" }],
        destination: `https://${canonicalHost}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
