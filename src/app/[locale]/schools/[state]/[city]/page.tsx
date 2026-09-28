import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublicCityAreaBySlug } from "@/lib/db/public-adapter";
import { cityPath } from "@/lib/urls";
import { LocalityView, localityMetadata } from "../../../_views/entity-page";
import { PlaceView, placeMetadata } from "../../../_views/place-page";
import { resolveLocality } from "../../../_views/resolve";

/**
 * /schools/{state}/{city} — a city (D-121 §1). For a city-state (Delhi, D-126)
 * the second segment is an area within the city: /schools/delhi/{locality}.
 */
async function load(stateSlug: string, second: string) {
  const cityState = await getPublicCityAreaBySlug(stateSlug);
  if (cityState?.isCityState) {
    const locality = await resolveLocality(cityState.citySlug, second);
    return locality ? ({ kind: "locality", locality } as const) : null;
  }
  const city = await getPublicCityAreaBySlug(second);
  if (!city?.isLaunch || city.isCityState) return null;
  return { kind: "city", city, wrongState: city.stateSlug !== stateSlug } as const;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/schools/[state]/[city]">): Promise<Metadata> {
  const { locale, state, city } = await params;
  const loaded = await load(state, city);
  if (!loaded) return { title: "Not found" };
  if (loaded.kind === "locality") {
    return loaded.locality.kind === "town"
      ? placeMetadata(locale, loaded.locality, {})
      : localityMetadata(locale, loaded.locality.resolved);
  }
  if (loaded.wrongState) return { title: "Redirecting" };
  return placeMetadata(locale, { kind: "city", city: loaded.city }, await searchParams);
}

export default async function CityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/schools/[state]/[city]">) {
  const { locale, state, city } = await params;
  const loaded = await load(state, city);
  if (!loaded) notFound();
  if (loaded.kind === "locality") {
    return loaded.locality.kind === "town" ? (
      <PlaceView locale={locale} resolved={loaded.locality} rawSearchParams={{}} />
    ) : (
      <LocalityView locale={locale} resolved={loaded.locality.resolved} />
    );
  }
  if (loaded.wrongState) {
    permanentRedirect(cityPath(locale, loaded.city.stateSlug, loaded.city.citySlug));
  }
  return (
    <PlaceView
      locale={locale}
      resolved={{ kind: "city", city: loaded.city }}
      rawSearchParams={await searchParams}
    />
  );
}
