import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { localityPath } from "@/lib/urls";
import { LocalityView, localityMetadata } from "../../../../_views/entity-page";
import { PlaceView, placeMetadata } from "../../../../_views/place-page";
import { resolveLocality } from "../../../../_views/resolve";

/** /schools/{state}/{city}/{locality} — discovery (D-121 §1); towns use the town template. */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/schools/[state]/[city]/[locality]">): Promise<Metadata> {
  const { locale, state, city, locality } = await params;
  const resolved = await resolveLocality(city, locality);
  if (!resolved) return { title: "Not found" };
  if (resolved.kind === "town") {
    if (resolved.town.stateSlug !== state) return { title: "Redirecting" };
    return placeMetadata(locale, resolved, {});
  }
  if (resolved.resolved.city.stateSlug !== state) return { title: "Redirecting" };
  return localityMetadata(locale, resolved.resolved);
}

export default async function LocalityPage({
  params,
}: PageProps<"/[locale]/schools/[state]/[city]/[locality]">) {
  const { locale, state, city, locality } = await params;
  const resolved = await resolveLocality(city, locality);
  if (!resolved) notFound();

  if (resolved.kind === "town") {
    const { town } = resolved;
    if (!town.isLaunch) notFound();
    if (town.stateSlug !== state) {
      permanentRedirect(localityPath(locale, town.stateSlug, town.citySlug, town.townSlug));
    }
    return <PlaceView locale={locale} resolved={resolved} rawSearchParams={{}} />;
  }

  const { city: cityArea, locality: loc } = resolved.resolved;
  if (cityArea.stateSlug !== state) {
    permanentRedirect(localityPath(locale, cityArea.stateSlug, cityArea.citySlug, loc.slug));
  }
  return <LocalityView locale={locale} resolved={resolved.resolved} />;
}
