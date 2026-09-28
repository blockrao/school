import {
  getPublicCityAreaBySlug,
  getPublicLocalityBySlug,
  getPublicSchoolBySlug,
  getPublicTownAreaBySlug,
  getSchoolRedirectSlug,
  type PublicSchoolBundle,
} from "@/lib/db/public-adapter";

export type ResolvedCity = NonNullable<Awaited<ReturnType<typeof getPublicCityAreaBySlug>>>;

export type ResolvedSchool = { bundle: PublicSchoolBundle; city: ResolvedCity | null };

export type ResolvedLocality = {
  city: ResolvedCity;
  locality: NonNullable<Awaited<ReturnType<typeof getPublicLocalityBySlug>>>;
};

/**
 * /school/{slug}: the school itself, or where to 301 (merged school, alias or
 * retired slug). All redirects land on the canonical slug in
 * one hop (D-121 §8). Closed schools resolve normally (the page shows a banner).
 */
export async function resolveSchoolSlug(
  slug: string,
): Promise<
  { kind: "school"; resolved: ResolvedSchool } | { kind: "redirect"; slug: string } | null
> {
  const bundle = await getPublicSchoolBySlug(slug);
  if (bundle) {
    const city = bundle.school.city_slug
      ? await getPublicCityAreaBySlug(bundle.school.city_slug)
      : null;
    return { kind: "school", resolved: { bundle, city } };
  }

  const aliasTarget = await getSchoolRedirectSlug({ slug });
  if (aliasTarget) return { kind: "redirect", slug: aliasTarget };

  return null;
}

/** /schools/{state}/{city}/{locality}: a locality, or a town (rendered with the town template). */
export async function resolveLocality(citySlug: string, localitySlug: string) {
  const town = await getPublicTownAreaBySlug(localitySlug);
  if (town && town.citySlug === citySlug) return { kind: "town" as const, town };

  const city = await getPublicCityAreaBySlug(citySlug);
  if (!city?.isLaunch) return null;
  const locality = await getPublicLocalityBySlug(city.citySlug, localitySlug);
  if (!locality) return null;
  return { kind: "locality" as const, resolved: { city, locality } satisfies ResolvedLocality };
}
