import type { NextConfig } from "next";

// Read directly (not via env.server.ts): this file runs in plain Node, outside
// Next's react-server bundler condition, where the "server-only" import throws.
const siteIndexable = process.env.SITE_INDEXABLE === "true";

const nextConfig: NextConfig = {
  async headers() {
    if (siteIndexable) return [];

    // Pre-launch: belt-and-braces alongside robots.ts — noindex every response,
    // including ones robots.ts can't reach (API routes, error pages).
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
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
