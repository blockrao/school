import { siteUrl } from "@/lib/env.server";
import { LAUNCH_CITY_SLUGS } from "@/lib/sitemap";

/**
 * The sitemapindex referenced from robots.txt — sitemap-site.xml (homepage,
 * exams, teachers, guides and the other non-city-scoped pages) plus one
 * <sitemap> per launch city's child sitemap.
 */
export function GET() {
  const sitemapSlugs = ["site", ...LAUNCH_CITY_SLUGS];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapSlugs.map((slug) => `  <sitemap><loc>${siteUrl}/sitemap-${slug}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
