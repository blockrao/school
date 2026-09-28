import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCityAreaBySlug, getPublicStateAreaBySlug } from "@/lib/db/public-adapter";
import { PlaceView, placeMetadata, type ResolvedPlace } from "../../_views/place-page";

/**
 * /schools/{state} — the state's list of cities (D-121 §1), or, for a city-state
 * such as Delhi, the city page itself (D-126).
 */
async function resolve(stateSlug: string): Promise<ResolvedPlace | null> {
  const cityState = await getPublicCityAreaBySlug(stateSlug);
  if (cityState?.isCityState) return cityState.isLaunch ? { kind: "city", city: cityState } : null;
  const state = await getPublicStateAreaBySlug(stateSlug);
  return state ? { kind: "state", state } : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/schools/[state]">): Promise<Metadata> {
  const { locale, state } = await params;
  const resolved = await resolve(state);
  if (!resolved) return { title: "Not found" };
  return placeMetadata(locale, resolved, await searchParams);
}

export default async function StatePage({
  params,
  searchParams,
}: PageProps<"/[locale]/schools/[state]">) {
  const { locale, state } = await params;
  const resolved = await resolve(state);
  if (!resolved) notFound();
  return <PlaceView locale={locale} resolved={resolved} rawSearchParams={await searchParams} />;
}
