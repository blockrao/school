import { notFound, permanentRedirect } from "next/navigation";
import { lp } from "@/lib/urls";
import { legacyPlaceTarget } from "../_views/resolve";

/**
 * Legacy /{city}, /{town}, /{state} (pre-D-121) → one 301 to the canonical
 * /schools/… path, keeping any filter/page query string. Unknown → 404.
 */
export default async function LegacyPlaceRedirect({
  params,
  searchParams,
}: PageProps<"/[locale]/[city]">) {
  const { locale, city } = await params;
  const target = await legacyPlaceTarget(city);
  if (!target) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : []) query.append(key, v);
  }
  const qs = query.toString();
  permanentRedirect(`${lp(locale, target)}${qs ? `?${qs}` : ""}`);
}
