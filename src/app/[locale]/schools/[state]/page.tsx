import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCityAreaBySlug, getPublicStateAreaBySlug } from "@/lib/db/public-adapter";
import { PlaceView, placeMetadata, type ResolvedPlace } from "../../_views/place-page";

// Found 30 Sep 2026 while checking sitemap freshness ahead of GSC submission: this
// route (and its [city]/[locality] siblings) had no revalidate window at all, unlike
// every sibling content route (exams, jobs, events, news, guides all set 900-3600),
// so once statically rendered it could serve a frozen school-count snapshot
// indefinitely — reproduced live on /schools/rajasthan/jaipur showing a stale "103
// schools" well after published count had dropped to 38. Same 900s window as the
// other publish-gated listing pages.
export const revalidate = 900;

/**
 * /schools/{state} — the state's list of cities (D-121 §1), or, for a city-state
 * Database view fix: 2026-09-29
 * such as Delhi, the city page itself (D-126).
 */
async function resolve(stateSlug: string): Promise<ResolvedPlace | null> {
  const cityState = await getPublicCityAreaBySlug(stateSlug);
  if (cityState?.isCityState) return { kind: "city", city: cityState };
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
