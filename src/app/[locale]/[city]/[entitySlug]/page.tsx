import { notFound, permanentRedirect } from "next/navigation";
import { lp } from "@/lib/urls";
import { legacyEntityTarget } from "../../_views/resolve";

/**
 * Legacy /{city}/{slug}-{school_code} and /{city}/{locality} (pre-D-121) →
 * one 301 to /school/{slug} or /schools/{state}/{city}/{locality}.
 */
export default async function LegacyEntityRedirect({
  params,
}: PageProps<"/[locale]/[city]/[entitySlug]">) {
  const { locale, city, entitySlug } = await params;
  const target = await legacyEntityTarget(city, entitySlug);
  if (!target) notFound();
  permanentRedirect(lp(locale, target));
}
