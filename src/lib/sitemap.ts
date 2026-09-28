import "server-only";
import {
  getPublicCityAreaBySlug,
  listPublicAreas,
  listPublicLocalitiesByCity,
  listPublicSchoolsByDistrict,
  type PublicSchool,
} from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";

/**
 * Every city with its own child sitemap route file
 * (`src/app/sitemap-<slug>.xml/route.ts`, one per entry here — see
 * buildCitySitemapXml below). A literal per-city route file, not a dynamic
 * segment, for two reasons: (1) Next.js App Router doesn't support a folder
 * name that mixes a literal `.xml` suffix with a dynamic segment
 * (`sitemap-[city].xml` isn't valid — see dynamic-routes.md, a segment must
 * be wholly `[param]`), and (2) the top-level dynamic slot is already taken
 * by `[locale]`, and Next.js doesn't allow two different dynamic segment
 * names at the same level, which also rules out `generateSitemaps()`'s own
 * `/sitemap/[id].xml` convention living usefully alongside it here.
 *
 * 2026-09-28: expanded from a 1-city hardcoded list to all 22 districts
 * where api.public_areas.is_launch is true as of that date (see
 * db/views/040_public_areas.sql's data-driven policy). This array is NOT
 * read from the DB at runtime — `sitemap.xml/route.ts` (the index) only
 * lists a city here if a matching route file also exists, so the two must
 * be added together. When a 23rd (or later) city clears the is_launch bar,
 * add its slug here AND create `src/app/sitemap-<slug>.xml/route.ts` calling
 * `buildCitySitemapResponse("<slug>")` — copy any existing one, they're
 * identical one-liners.
 */
export const LAUNCH_CITY_SLUGS = [
  "jaipur",
  "gurugram",
  "faridabad",
  "hisar",
  "sonipat",
  "panipat",
  "karnal",
  "north-west-delhi",
  "bhiwani",
  "rohtak",
  "north-east-delhi",
  "west-delhi",
  "mahendragarh",
  "south-west-delhi",
  "rewari",
  "south-delhi",
  "ambala",
  "east-delhi",
  "panchkula",
  "north-delhi",
  "new-delhi",
  "central-delhi",
];

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * One <url> entry, English canonical with an English/Hindi hreflang pair —
 * shared by every sitemap-*.xml route (LAUNCH_CITY_SLUGS' city sitemaps and
 * sitemap-site.xml) so they stay byte-identical in shape. `path` is locale-free
 * (e.g. "/exams/rms-cet", not "/en/exams/rms-cet").
 */
export function urlEntry(siteUrl: string, path: string, lastModified?: Date): string {
  const en = xmlEscape(`${siteUrl}/en${path}`);
  const hi = xmlEscape(`${siteUrl}/hi${path}`);
  const lastmod = lastModified ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>` : "";
  return `  <url>
    <loc>${en}</loc>${lastmod}
    <xhtml:link rel="alternate" hreflang="en-IN" href="${en}" />
    <xhtml:link rel="alternate" hreflang="hi-IN" href="${hi}" />
  </url>`;
}

/** Wraps a list of urlEntry() strings in the sitemap urlset envelope. */
export function urlSetXml(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

/**
 * A school counts as indexable (L2+) once it has enough for a real page:
 * address + pincode, a contact point (phone or website), and coordinates.
 * Mirrors staging.schools_with_level's L1→L2 gate (db/views/100_staging_schools.sql)
 * — that view is analysis-only (claude_ro), so production recomputes the same
 * rule from api.public_schools' own fields instead of reading it.
 */
function isIndexable(school: PublicSchool): boolean {
  return (
    school.address != null &&
    school.pincode != null &&
    ((school.phone != null && school.phone.length > 0) || school.website != null) &&
    school.lat != null &&
    school.lng != null
  );
}

function maxVerifiedAt(schools: PublicSchool[]): Date | undefined {
  const times = schools
    .map((s) => s.last_verified_at)
    .filter((v): v is string => v != null)
    .map((v) => new Date(v).getTime());
  return times.length > 0 ? new Date(Math.max(...times)) : undefined;
}

/**
 * Shared body for every `src/app/sitemap-<slug>.xml/route.ts` file — see
 * LAUNCH_CITY_SLUGS above for why there's one literal file per city instead
 * of a dynamic route. Each of those files is just:
 *
 *   export async function GET() { return buildCitySitemapResponse("<slug>"); }
 *
 * 404s if the city isn't actually launched (is_launch=false), so a stale
 * route file left behind after a city drops out of launch — sourcing
 * regressed, say — stops serving instead of silently listing a dead city.
 */
export async function buildCitySitemapResponse(citySlug: string): Promise<Response> {
  const city = await getPublicCityAreaBySlug(citySlug);
  if (!city?.isLaunch) {
    return new Response("Not found", { status: 404 });
  }

  const [{ schools }, localities] = await Promise.all([
    listPublicSchoolsByDistrict(city.districtId, { pageSize: 2000 }),
    listPublicLocalitiesByCity(citySlug, 3),
  ]);

  const indexableSchools = schools.filter(isIndexable);

  const entries = [
    urlEntry(siteUrl, `/${citySlug}`, maxVerifiedAt(indexableSchools)),
    ...localities.map((locality) => {
      const path = locality.isTown ? `/${locality.slug}` : `/${citySlug}/${locality.slug}`;
      const localitySchools = indexableSchools.filter((s) => s.locality_id === locality.id);
      return urlEntry(siteUrl, path, maxVerifiedAt(localitySchools));
    }),
    ...indexableSchools.map((school) =>
      urlEntry(
        siteUrl,
        `/${citySlug}/${school.slug}-${school.school_code}`,
        school.last_verified_at ? new Date(school.last_verified_at) : undefined,
      ),
    ),
  ];

  return new Response(urlSetXml(entries), { headers: { "Content-Type": "application/xml" } });
}

/**
 * Every launched city's is_launch flag, live from the DB — used by
 * sitemap.xml/route.ts to drop a city from the index the moment it stops
 * qualifying, even though LAUNCH_CITY_SLUGS (which route files exist) stays
 * static until someone adds/removes a file.
 */
export async function listLiveLaunchedCitySlugs(): Promise<Set<string>> {
  const areas = await listPublicAreas();
  return new Set(areas.filter((a) => a.is_launch).map((a) => a.slug));
}
