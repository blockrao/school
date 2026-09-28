import "server-only";
import {
  getPublicCityAreaBySlug,
  listPublicAreas,
  listPublicLocalitiesByCity,
  listPublicSchoolsByDistrict,
  type PublicSchool,
} from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { cityPath, localityPath, schoolPath } from "@/lib/urls";

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
  "charkhi-dadri",
  "fatehabad",
  "jhajjar",
  "jind",
  "kaithal",
  "kurukshetra",
  "nuh-mewat",
  "palwal",
  "sirsa",
  "yamunanagar",
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
 * One <url> entry: the canonical URL only (D-121 §10 — sitemaps list only 200,
 * canonical, indexable URLs). No hreflang: no page is translated yet; when one
 * is, its alternates are emitted in the page head. `path` is the unprefixed
 * canonical path (e.g. "/exams/rms-cet"); "" is the home page.
 */
export function urlEntry(siteUrl: string, path: string, lastModified?: Date): string {
  const loc = xmlEscape(`${siteUrl}${path || "/"}`);
  const lastmod = lastModified ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>` : "";
  return `  <url>
    <loc>${loc}</loc>${lastmod}
  </url>`;
}

/** Wraps a list of urlEntry() strings in the sitemap urlset envelope. */
export function urlSetXml(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

/**
 * Every published school in a district (D-119), paged in blocks of 1,000 so
 * the database's per-request row cap never truncates a city's sitemap.
 */
async function listAllPublishedSchoolsInDistrict(districtId: number): Promise<PublicSchool[]> {
  const pageSize = 1000;
  const all: PublicSchool[] = [];
  for (let page = 1; ; page++) {
    const { schools } = await listPublicSchoolsByDistrict(districtId, { page, pageSize });
    all.push(...schools);
    if (schools.length < pageSize) return all;
  }
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

  const [indexableSchools, localities] = await Promise.all([
    listAllPublishedSchoolsInDistrict(city.districtId),
    listPublicLocalitiesByCity(citySlug, 3),
  ]);

  const entries = [
    urlEntry(
      siteUrl,
      cityPath("en", city.stateSlug, city.citySlug),
      maxVerifiedAt(indexableSchools),
    ),
    ...localities.map((locality) => {
      const localitySchools = indexableSchools.filter((s) => s.locality_id === locality.id);
      return urlEntry(
        siteUrl,
        localityPath("en", city.stateSlug, city.citySlug, locality.slug),
        maxVerifiedAt(localitySchools),
      );
    }),
    ...indexableSchools.map((school) =>
      urlEntry(
        siteUrl,
        schoolPath("en", school.slug),
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
