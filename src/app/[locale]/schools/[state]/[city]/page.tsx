import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublicCityAreaBySlug } from "@/lib/db/public-adapter";
import { cityPath } from "@/lib/urls";
import { PlaceView, placeMetadata } from "../../../_views/place-page";

/** /schools/{state}/{city} — discovery (D-121 §1). A city under the wrong state 301s. */
async function load(stateSlug: string, citySlug: string) {
  const city = await getPublicCityAreaBySlug(citySlug);
  if (!city?.isLaunch) return null;
  return { city, wrongState: city.stateSlug !== stateSlug };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/schools/[state]/[city]">): Promise<Metadata> {
  const { locale, state, city } = await params;
  const loaded = await load(state, city);
  if (!loaded || loaded.wrongState) return { title: "Not found" };
  return placeMetadata(locale, { kind: "city", city: loaded.city }, await searchParams);
}

export default async function CityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/schools/[state]/[city]">) {
  const { locale, state, city } = await params;
  const loaded = await load(state, city);
  if (!loaded) notFound();
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
