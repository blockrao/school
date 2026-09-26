import {
  getPublicCityAreaBySlug,
  listPublicLocalitiesByCity,
  listPublicSchoolsByDistrict,
  type PublicSchool,
} from "@/lib/db/public-adapter";
import { siteUrl } from "@/lib/env.server";
import { urlEntry, urlSetXml } from "@/lib/sitemap";

const CITY_SLUG = "jaipur";

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

export async function GET() {
  const city = await getPublicCityAreaBySlug(CITY_SLUG);
  if (!city?.isLaunch) {
    return new Response("Not found", { status: 404 });
  }

  const [{ schools }, localities] = await Promise.all([
    listPublicSchoolsByDistrict(city.districtId, { pageSize: 1000 }),
    listPublicLocalitiesByCity(CITY_SLUG, 3),
  ]);

  const indexableSchools = schools.filter(isIndexable);

  const entries = [
    urlEntry(siteUrl, `/${CITY_SLUG}`, maxVerifiedAt(indexableSchools)),
    ...localities.map((locality) => {
      const path = locality.isTown ? `/${locality.slug}` : `/${CITY_SLUG}/${locality.slug}`;
      const localitySchools = indexableSchools.filter((s) => s.locality_id === locality.id);
      return urlEntry(siteUrl, path, maxVerifiedAt(localitySchools));
    }),
    ...indexableSchools.map((school) =>
      urlEntry(
        siteUrl,
        `/${CITY_SLUG}/${school.slug}-${school.school_code}`,
        school.last_verified_at ? new Date(school.last_verified_at) : undefined,
      ),
    ),
  ];

  return new Response(urlSetXml(entries), { headers: { "Content-Type": "application/xml" } });
}
