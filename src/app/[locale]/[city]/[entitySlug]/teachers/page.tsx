import { notFound, permanentRedirect } from "next/navigation";
import { lp } from "@/lib/urls";
import { legacyEntityTarget } from "../../../_views/resolve";

/** Legacy /{city}/{slug}-{code}/teachers → the teachers section of /school/{slug} (D-121 §4). */
export default async function LegacyTeachersRedirect({
  params,
}: PageProps<"/[locale]/[city]/[entitySlug]/teachers">) {
  const { locale, city, entitySlug } = await params;
  const target = await legacyEntityTarget(city, entitySlug);
  if (!target?.startsWith("/school/")) notFound();
  permanentRedirect(`${lp(locale, target)}#teachers-heading`);
}
