import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublicCityAreaBySlug } from "@/lib/db/public-adapter";
import { cityPath } from "@/lib/urls";
import { LocalityView, localityMetadata } from "./entity-page";
import { PlaceView, placeMetadata } from "./place-page";
import { resolveLocality } from "./resolve";

type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * /schools/{state}/{city} — a city (D-121 §1). For a city-state (Delhi, D-126)
 * the second segment is an area within the city: /schools/delhi/{locality}.
 *
 * Shared by two routes: the public, edge-cached page (no query string, so it
 * cannot read searchParams) and the internal dynamic route the proxy sends
 * filtered / paginated / compare requests to.
 */
async function load(stateSlug: string, second: string) {
  const cityState = await getPublicCityAreaBySlug(stateSlug);
  if (cityState?.isCityState) {
    const locality = await resolveLocality(cityState.citySlug, second);
    return locality ? ({ kind: "locality", locality } as const) : null;
  }
  const city = await getPublicCityAreaBySlug(second);
  if (!city || city.isCityState) return null;
  return { kind: "city", city, wrongState: city.stateSlug !== stateSlug } as const;
}

export async function cityRouteMetadata(
  locale: string,
  state: string,
  citySlug: string,
  searchParams: SearchParams,
  view: "hub" | "list" = "list",
): Promise<Metadata> {
  const loaded = await load(state, citySlug);
  if (!loaded) return { title: "Not found" };
  if (loaded.kind === "locality") {
    return loaded.locality.kind === "town"
      ? placeMetadata(locale, loaded.locality, {})
      : localityMetadata(locale, loaded.locality.resolved);
  }
  if (loaded.wrongState) return { title: "Redirecting" };
  return placeMetadata(locale, { kind: "city", city: loaded.city }, searchParams, undefined, view);
}

export async function CityRouteView({
  locale,
  state,
  citySlug,
  searchParams,
  view = "list",
}: {
  locale: string;
  state: string;
  citySlug: string;
  searchParams: SearchParams;
  view?: "hub" | "list";
}) {
  const loaded = await load(state, citySlug);
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
      rawSearchParams={searchParams}
      view={view}
    />
  );
}
