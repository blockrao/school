import {
  getPublicCityAreaBySlug,
  getPublicLocalityBySlug,
  getPublicSchoolByCode,
  getPublicSchoolByIdSlug,
  getPublicSchoolBySlug,
  getPublicTownAreaBySlug,
  getSchoolRedirectSlug,
  type PublicSchoolBundle,
} from "@/lib/db/public-adapter";
import { cityPath, localityPath, schoolPath, statePath } from "@/lib/urls";
import { resolvePlace } from "./place-page";

export type ResolvedCity = NonNullable<Awaited<ReturnType<typeof getPublicCityAreaBySlug>>>;

export type ResolvedSchool = { bundle: PublicSchoolBundle; city: ResolvedCity | null };

export type ResolvedLocality = {
  city: ResolvedCity;
  locality: NonNullable<Awaited<ReturnType<typeof getPublicLocalityBySlug>>>;
};

/** Legacy /school/{uuid}-{slug} (pre-D-121). */
const LEGACY_UUID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(-|$)/;

/**
 * /school/{slug}: the school itself, or where to 301 (merged school, alias or
 * retired slug, legacy UUID form). All redirects land on the canonical slug in
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

  const uuid = LEGACY_UUID_RE.exec(slug)?.[1];
  if (uuid) {
    const byId = await getPublicSchoolByIdSlug(uuid);
    if (byId) return { kind: "redirect", slug: byId.school.slug };
    const mergedTarget = await getSchoolRedirectSlug({ id: uuid });
    if (mergedTarget) return { kind: "redirect", slug: mergedTarget };
  }
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

const LEGACY_SCHOOL_CODE_RE = /^(.+)-(\d{6})$/;

/**
 * Canonical (unprefixed) path for a legacy /{place} URL, or null → 404.
 * Handles /{city}, /{town}, /{state}.
 */
export async function legacyPlaceTarget(placeSlug: string): Promise<string | null> {
  const place = await resolvePlace(placeSlug);
  if (!place) return null;
  if (place.kind === "state") return statePath("en", place.state.stateSlug);
  if (place.kind === "town") {
    const { town } = place;
    return localityPath("en", town.stateSlug, town.citySlug, town.townSlug);
  }
  return cityPath("en", place.city.stateSlug, place.city.citySlug);
}

/**
 * Canonical (unprefixed) path for a legacy /{city}/{entity} URL, or null → 404.
 * Handles /{city}/{locality} and /{city}/{slug}-{school_code}.
 */
export async function legacyEntityTarget(
  citySlug: string,
  entitySlug: string,
): Promise<string | null> {
  const code = LEGACY_SCHOOL_CODE_RE.exec(entitySlug)?.[2];
  if (code) {
    const bundle = await getPublicSchoolByCode(Number(code));
    if (bundle) return schoolPath("en", bundle.school.slug);
    const merged = await getSchoolRedirectSlug({ code: Number(code) });
    return merged ? schoolPath("en", merged) : null;
  }

  const locality = await resolveLocality(citySlug, entitySlug);
  if (locality?.kind === "town") {
    const { town } = locality;
    return localityPath("en", town.stateSlug, town.citySlug, town.townSlug);
  }
  if (locality?.kind === "locality") {
    const { city, locality: loc } = locality.resolved;
    return localityPath("en", city.stateSlug, city.citySlug, loc.slug);
  }
  return null;
}
