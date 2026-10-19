import type { Metadata } from "next";
import { CityRouteView, cityRouteMetadata } from "../../../_views/city-route";

// Dynamic page: render on-demand instead of trying to pre-render at build time.
// This avoids build-time database access issues and lets pages render with live data.
export const dynamic = "force-dynamic";

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
