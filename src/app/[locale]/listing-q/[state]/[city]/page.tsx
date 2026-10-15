import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CityRouteView, cityRouteMetadata } from "../../../_views/city-route";

// Internal route. The proxy rewrites /schools/{state}/{city}?… here; it is not
// a public URL (direct requests lack the proxy's marker header and 404).
export const dynamic = "force-dynamic";

async function guard() {
  if ((await headers()).get("x-listing-internal") !== "1") notFound();
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/listing-q/[state]/[city]">): Promise<Metadata> {
  await guard();
  const { locale, state, city } = await params;
  return cityRouteMetadata(locale, state, city, await searchParams);
}

export default async function ListingQueryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/listing-q/[state]/[city]">) {
  await guard();
  const { locale, state, city } = await params;
  return (
    <CityRouteView
      locale={locale}
      state={state}
      citySlug={city}
      searchParams={await searchParams}
    />
  );
}
