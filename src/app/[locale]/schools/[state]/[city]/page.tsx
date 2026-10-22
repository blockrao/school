import type { Metadata } from "next";
import { CityRouteView, cityRouteMetadata } from "../../../_views/city-route";

// Rendered on demand and cached for 15 minutes. Previously force-dynamic meant every
// crawler hit re-ran the database queries.
export const revalidate = 900;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/schools/[state]/[city]">): Promise<Metadata> {
  const { locale, state, city } = await params;
  return cityRouteMetadata(locale, state, city, {}, "hub");
}

export default async function CityPage({ params }: PageProps<"/[locale]/schools/[state]/[city]">) {
  const { locale, state, city } = await params;
  return (
    <CityRouteView locale={locale} state={state} citySlug={city} searchParams={{}} view="hub" />
  );
}
