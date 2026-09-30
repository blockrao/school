import "server-only";
import {
  getBoardNamesBySchoolId,
  getPublicCityAreaBySlug,
  listPublicLocalitiesByCity,
  listPublicSchoolsByDistrict,
  type PublicSchool,
} from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { meetsIndexabilityGate } from "@/lib/school-metadata";
import { cityPath, localityPath, schoolPath } from "@/lib/urls";

/**
 * Every city/area with its own child sitemap route file
 * (`src/app/sitemap-<slug>.xml/route.ts`, one per entry here — see
 * buildCitySitemapResponse below). A literal per-city route file, not a
 * dynamic segment, for two reasons: (1) Next.js App Router doesn't support a
 * folder name that mixes a literal `.xml` suffix with a dynamic segment
 * (`sitemap-[city].xml` isn't valid — see dynamic-routes.md, a segment must
 * be wholly `[param]`), and (2) the top-level dynamic slot is already taken
 * by `[locale]`, and Next.js doesn't allow two different dynamic segment
 * names at the same level, which also rules out `generateSitemaps()`'s own
 * `/sitemap/[id].xml` convention living usefully alongside it here.
 *
 * Launch gate removed entirely (30 Sep 2026, Prav) — every area always has
 * a real page, so this is just the list of areas that exist (api.public_areas),
 * one entry per district-or-city-state row. NOT read from the DB at runtime —
 * `sitemap.xml/route.ts` (the index) lists every slug here unconditionally,
 * and each one needs a matching route file. When a new area is added, add its
 * slug here AND create `src/app/sitemap-<slug>.xml/route.ts` calling
 * `buildCitySitemapResponse("<slug>")` — copy any existing one, they're
 * identical one-liners.
 */
export const CITY_SITEMAP_SLUGS = [
  "jaipur",
  "gurugram",
  "delhi",
  "faridabad",
  "hisar",
  "sonipat",
  "panipat",
  "karnal",
  "bhiwani",
  "rohtak",
  "mahendragarh",
  "rewari",
  "ambala",
  "panchkula",
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

/**
 * Cache-Control for every sitemap Response (index, sitemap-site.xml, and
 * each sitemap-<city>.xml). Found 30 Sep 2026: none of these routes set any
 * Cache-Control at all, and the sitemap.xml index was observed serving a
 * stale copy in production (still listing a city sitemap well after that
 * city's data should have dropped it) — reproducible across repeated
 * fetches with cache-busting query params, with no explicit header on the
 * Response to stop a CDN from applying its own default caching heuristic to
 * the 200. s-maxage=900 matches this repo's page-level ISR convention
 * (`export const revalidate = 900`, used on every dynamic page route) so a
 * sitemap is never staler than the pages it lists; stale-while-revalidate
 * keeps a request from ever blocking on a cache miss.
 */
export const SITEMAP_CACHE_CONTROL = "public, max-age=0, s-maxage=900, stale-while-revalidate=1800";

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
async function listAllPublishedSchoolsInDistrict(districtIds: number[]): Promise<PublicSchool[]> {
  const pageSize = 1000;
  const all: PublicSchool[] = [];
  for (let page = 1; ; page++) {
    const { schools } = await listPublicSchoolsByDistrict(districtIds, { page, pageSize });
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
 * CITY_SITEMAP_SLUGS above for why there's one literal file per city instead
 * of a dynamic route. Each of those files is just:
 *
 *   export async function GET() { return buildCitySitemapResponse("<slug>"); }
 *
 * 404s only if the slug isn't a real area at all (a stale/renamed route
 * file). There is no launch gate any more (removed 30 Sep 2026) — every real
 * area's sitemap always serves, even with zero published schools yet; its
 * <url> list is just the city/locality pages until schools get published.
 */
export async function buildCitySitemapResponse(citySlug: string): Promise<Response> {
  const city = await getPublicCityAreaBySlug(citySlug);
  if (!city) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  // "indexableSchools" here used to mean only "published" (api.public_schools'
  // own filter) — every published school got its own <url> entry regardless
  // of whether the page itself was actually indexable. Found 29 Sep 2026,
  // same session as the entity page's meetsIndexabilityGate() (D-114): once
  // that gate started emitting `noindex,follow` for sparse schools, this
  // sitemap kept submitting those same URLs anyway — "Submitted URL marked
  // 'noindex'" in Search Console, and a direct contradiction of this repo's
  // own D-121 §10 rule ("only indexable URLs"). Fixed by re-running the same
  // gate here (bulk board lookup, not a per-school join, so this stays cheap
  // at thousands-of-schools-per-city scale) and only emitting a <url> entry
  // for schools that actually pass it. City/locality aggregate pages are
  // unaffected — they're indexable regardless of any one school's own gate.
  const [publishedSchools, localities] = await Promise.all([
    listAllPublishedSchoolsInDistrict(city.districtIds),
    listPublicLocalitiesByCity(citySlug, 3),
  ]);
  const boardNames = await getBoardNamesBySchoolId(publishedSchools.map((s) => s.id));
  const sitemapEligibleSchools = publishedSchools.filter((school) => {
    const boardName = boardNames.get(school.id);
    return meetsIndexabilityGate(school, boardName != null ? { board_name: boardName } : null);
  });

  const entries = [
    urlEntry(
      siteUrl,
      cityPath("en", city.stateSlug, city.citySlug),
      maxVerifiedAt(publishedSchools),
    ),
    ...localities.map((locality) => {
      const localitySchools = publishedSchools.filter((s) => s.locality_id === locality.id);
      return urlEntry(
        siteUrl,
        localityPath("en", city.stateSlug, city.citySlug, locality.slug),
        maxVerifiedAt(localitySchools),
      );
    }),
    ...sitemapEligibleSchools.map((school) =>
      urlEntry(
        siteUrl,
        schoolPath("en", school.slug),
        school.last_verified_at ? new Date(school.last_verified_at) : undefined,
      ),
    ),
  ];

  return new Response(urlSetXml(entries), {
    headers: { "Content-Type": "application/xml", "Cache-Control": SITEMAP_CACHE_CONTROL },
  });
}
