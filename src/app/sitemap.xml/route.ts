import { siteUrl } from "@/lib/env.server";
import { CITY_SITEMAP_SLUGS, SITEMAP_CACHE_CONTROL } from "@/lib/sitemap";

/**
 * The sitemapindex referenced from robots.txt — sitemap-site.xml (homepage,
 * exams, teachers, guides and the other non-city-scoped pages) plus one
 * <sitemap> per area's child sitemap.
 *
 * Launch gate removed entirely (30 Sep 2026, Prav) — every area in
 * CITY_SITEMAP_SLUGS is always listed unconditionally; there is no more
 * live is_launch flag to intersect against. Visibility now lives purely at
 * the school record level (schools.status), controlled by the ops portal —
 * an area with zero published schools yet still gets a sitemap, it's just a
 * short one (city/locality pages only, no school <url> entries).
 */
export async function GET() {
  const sitemapSlugs = ["site", ...CITY_SITEMAP_SLUGS];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapSlugs.map((slug) => `  <sitemap><loc>${siteUrl}/sitemap-${slug}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": SITEMAP_CACHE_CONTROL },
  });
}
