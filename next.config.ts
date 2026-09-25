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
};

export default nextConfig;
