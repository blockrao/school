import type { Metadata } from "next";
import { CityRouteView, cityRouteMetadata } from "../../../_views/city-route";

// Edge-cached (ISR) city page: the unfiltered, first-page listing. It never
// reads searchParams — requests carrying a query string (?page=, ?board=,
// ?compare= …) are rewritten by src/proxy.ts to the dynamic listing route.
export const revalidate = 900;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/schools/[state]/[city]">): Promise<Metadata> {
  const { locale, state, city } = await params;
  return cityRouteMetadata(locale, state, city, {});
}

export default async function CityPage({ params }: PageProps<"/[locale]/schools/[state]/[city]">) {
  const { locale, state, city } = await params;
  return <CityRouteView locale={locale} state={state} citySlug={city} searchParams={{}} />;
}
