import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStateAreaBySlug } from "@/lib/db/public-adapter";
import { PlaceView, placeMetadata } from "../../_views/place-page";

/** /schools/{state} — discovery (D-121 §1). */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/schools/[state]">): Promise<Metadata> {
  const { locale, state } = await params;
  const area = await getPublicStateAreaBySlug(state);
  if (!area) return { title: "Not found" };
  return placeMetadata(locale, { kind: "state", state: area }, {});
}

export default async function StatePage({ params }: PageProps<"/[locale]/schools/[state]">) {
  const { locale, state } = await params;
  const area = await getPublicStateAreaBySlug(state);
  if (!area) notFound();
  return (
    <PlaceView locale={locale} resolved={{ kind: "state", state: area }} rawSearchParams={{}} />
  );
}
