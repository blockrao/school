import { siteUrl } from "@/lib/env.server";
import { LAUNCH_CITY_SLUGS } from "@/lib/sitemap";

/** The sitemapindex referenced from robots.txt — one <sitemap> per launch city's child sitemap. */
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${LAUNCH_CITY_SLUGS.map((slug) => `  <sitemap><loc>${siteUrl}/sitemap-${slug}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
