import type { MetadataRoute } from "next";
import { serverEnv, siteUrl } from "@/lib/env.server";

// Search engines and AI answer engines may crawl every public page.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
];
const DISALLOW = ["/dev", "/my", "/portal", "/ops", "/api"];

export default function robots(): MetadataRoute.Robots {
  // Vercel Preview deployments are copies of the site on *.vercel.app; keep them
  // out of search so they never compete with the production host.
  if (serverEnv.VERCEL_ENV === "preview") {
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
