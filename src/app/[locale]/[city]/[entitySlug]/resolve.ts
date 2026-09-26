import {
  getPublicCityAreaBySlug,
  getPublicCityByDistrictId,
  getPublicLocalityBySlug,
  getPublicSchoolByCode,
} from "@/lib/db/public-adapter";
import { parseSchoolSlugCode } from "@/lib/school-url";

export type ResolvedCity = NonNullable<Awaited<ReturnType<typeof getPublicCityAreaBySlug>>>;

export type Resolution =
  | { kind: "redirect"; to: string }
  | {
      kind: "locality";
      city: ResolvedCity;
      locality: NonNullable<Awaited<ReturnType<typeof getPublicLocalityBySlug>>>;
    }
  | {
      kind: "school";
      city: ResolvedCity;
      bundle: NonNullable<Awaited<ReturnType<typeof getPublicSchoolByCode>>>;
    };

/**
 * `/[locale]/[city]/[entitySlug]` serves two different entities under one
 * dynamic segment — a locality (existing behavior) or a school
 * (`[slug]-[school_code]`) — because Next.js App Router doesn't allow two
 * sibling dynamic folders with different param names at the same position
 * (this position already has to serve locality slugs, so a second
 * `[schoolSlug]` folder next to it is a build-time error, not just a style
 * choice). Locality is tried first since its slugs are a small known set;
 * school_code's 6-digit suffix (see parseSchoolSlugCode) is what tells a
 * school reference apart from a locality slug the rest of the time.
 *
 * Shared between the page (page.tsx) and its markdown twin (index.md/route.ts)
 * so both resolve identically.
 */
export async function resolveEntity(
  citySlug: string,
  entitySlug: string,
): Promise<Resolution | null> {
  const city = await getPublicCityAreaBySlug(citySlug);
  if (!city?.isLaunch) return null;

  const locality = await getPublicLocalityBySlug(city.citySlug, entitySlug);
  if (locality) {
    // Towns are peer-level in the URL (/[town], not nested under a city) — a
    // locality-shaped request for one belongs at that URL instead.
    if (locality.isTown) return { kind: "redirect", to: `/${locality.slug}` };
    return { kind: "locality", city, locality };
  }

  const parsed = parseSchoolSlugCode(entitySlug);
  if (!parsed) return null;

  const bundle = await getPublicSchoolByCode(parsed.code);
  if (!bundle) return null;

  const schoolCity = bundle.school.district_id
    ? await getPublicCityByDistrictId(bundle.school.district_id)
    : null;
  if (!schoolCity) return null;

  if (schoolCity.slug !== citySlug || bundle.school.slug !== parsed.slug) {
    return { kind: "redirect", to: `/${schoolCity.slug}/${bundle.school.slug}-${parsed.code}` };
  }

  return { kind: "school", city, bundle };
}
