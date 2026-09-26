import type { NextConfig } from "next";

// Read directly (not via env.server.ts): this file runs in plain Node, outside
// Next's react-server bundler condition, where the "server-only" import throws.
const siteIndexable = process.env.SITE_INDEXABLE === "true";

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
    if (siteIndexable) return [{ source: "/:path*", headers: securityHeaders }];

    // Pre-launch: belt-and-braces alongside robots.ts — noindex every response,
    // including ones robots.ts can't reach (API routes, error pages).
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    // Canonical domain is https://www.schooloye.com. Host-matched, so Preview
    // deployments (different *.vercel.app hostnames) are untouched.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "schooloye.com" }],
        destination: "https://www.schooloye.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "school-ten-ivory.vercel.app" }],
        destination: "https://www.schooloye.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
