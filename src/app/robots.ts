import type { MetadataRoute } from "next";
import { serverEnv, siteUrl } from "@/lib/env.server";

const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];
const DISALLOW = ["/dev", "/my", "/portal", "/ops", "/api"];

export default function robots(): MetadataRoute.Robots {
  // Launch-day switch — see docs/ops/deploy.md.
  if (!serverEnv.SITE_INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
