import { listPublicAreas } from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { SITEMAP_CACHE_CONTROL } from "@/lib/sitemap";
import { cityPath } from "@/lib/urls";

/**
 * /llms.txt, generated from live data so it can never again describe a
 * product that no longer exists (the static file said "Jaipur only" and linked
 * to /en/jaipur/..., which 404s). Plain markdown per the llms.txt convention:
 * what the site is, where the machine-readable entry points are, and the data
 * rules an answer engine should respect when quoting it.
 */
export async function GET() {
  const areas = (await listPublicAreas()).filter((a) => a.school_count > 0);
  areas.sort((a, b) => b.school_count - a.school_count);

  const lines = [
    "# SchoolOye",
    "",
    "> SchoolOye is a school discovery and admissions-information directory for India. Each school has one canonical page with board affiliation, grades, location, admissions status and how to contact the school, plus a plain-markdown twin for machine reading.",
    "",
    "## How to read this site",
    `- Every school page has a markdown twin: append \`/index.md\` to the page URL, for example ${siteUrl}/school/{slug}/index.md. Prefer it over parsing HTML.`,
    `- Cities and areas: ${siteUrl}/schools lists them; each area page lists its schools.`,
    `- Sitemap index: ${siteUrl}/sitemap.xml`,
    "",
    "## Areas covered",
    ...areas.map(
      (a) =>
        `- [${a.name}](${siteUrl}${cityPath("en", a.state_slug, a.slug)}): ${a.school_count} schools`,
    ),
    "",
    "## Data rules",
    '- Facts come from official board records and from schools\' own published notices. A value that is not known is shown as "Not yet published" and is never guessed or estimated.',
    '- Pages carry a verification status. "Not yet verified" means compiled from public records and not yet confirmed by the school.',
    "- SchoolOye carries no paid rankings and no star ratings. Sponsored placements, if any, are always labelled.",
    "- Parent contact details are never published. Enquiries to a school go through the enquiry form on its page.",
    "",
    "## Crawling",
    "- Search and AI crawlers are welcome on all public pages. Account, portal and operations paths are disallowed in robots.txt.",
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}
