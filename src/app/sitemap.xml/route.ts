import { siteUrl } from "@/lib/env.server";
import { LAUNCH_CITY_SLUGS, listLiveLaunchedCitySlugs, SITEMAP_CACHE_CONTROL } from "@/lib/sitemap";

/**
 * The sitemapindex referenced from robots.txt — sitemap-site.xml (homepage,
 * exams, teachers, guides and the other non-city-scoped pages) plus one
 * <sitemap> per launch city's child sitemap.
 *
 * Intersects LAUNCH_CITY_SLUGS (which cities have a route file — see that
 * constant's comment) with the live is_launch flag from the DB, so a city
 * that regresses below the launch bar (sourcing gets worse, not better)
 * drops out of the index immediately without a code change, even though its
 * route file — which itself 404s once is_launch is false — stays in place.
 */
export async function GET() {
  const live = await listLiveLaunchedCitySlugs();
  const sitemapSlugs = ["site", ...LAUNCH_CITY_SLUGS.filter((slug) => live.has(slug))];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapSlugs.map((slug) => `  <sitemap><loc>${siteUrl}/sitemap-${slug}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": SITEMAP_CACHE_CONTROL },
  });
}
