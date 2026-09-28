import type { NextConfig } from "next";

// Read directly (not via env.server.ts): this file runs in plain Node, outside
// Next's react-server bundler condition, where the "server-only" import throws.
// Only Vercel Preview copies are kept out of search; production is always open.
const isPreview = process.env.VERCEL_ENV === "preview";

// OWASP secure-headers baseline. No third-party scripts/styles are loaded
// anywhere in this app today (checked: no GTM/Sentry/analytics tags), so the
// CSP can stay strict — 'unsafe-inline' is kept only for style-src, which
// Tailwind's inlined critical CSS needs without a nonce-based setup. Supabase
// is reached from the browser client (src/lib/db/browser.ts), so connect-src
// allows *.supabase.co for the REST/Auth/Realtime calls it makes.
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
      "script-src 'self'",
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
  async headers() {
    if (!isPreview) return [{ source: "/:path*", headers: securityHeaders }];

    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    // One hostname (D-121 §11). The canonical host comes from NEXT_PUBLIC_SITE_URL
    // (default www.schooloye.com; the spec's target is the apex, schooloye.com —
    // switch by setting NEXT_PUBLIC_SITE_URL=https://schooloye.com AND making the
    // apex the primary domain in Vercel, in the same deploy). The other variant and
    // the production *.vercel.app alias 301 to it. Preview hosts are untouched.
    const canonicalHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.schooloye.com")
      .host;
    const otherHosts = ["schooloye.com", "www.schooloye.com", "school-ten-ivory.vercel.app"].filter(
      (host) => host !== canonicalHost,
    );
    return otherHosts.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `https://${canonicalHost}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;
