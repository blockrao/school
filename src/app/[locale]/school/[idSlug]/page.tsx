import { notFound, permanentRedirect } from "next/navigation";
import { getSchoolCanonicalPath } from "@/lib/db/public-adapter";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Legacy canonical URL (flat, UUID-keyed) from before the /[city]/[slug]-[code]
 * migration — kept alive as a permanent redirect so old inbound links/SEO
 * equity and anything still in the wild (bookmarks, shared links, the old
 * sitemap) keep landing on the right page instead of 404ing.
 */
export default async function LegacySchoolRedirect({
  params,
}: PageProps<"/[locale]/school/[idSlug]">) {
  const { locale, idSlug } = await params;
  if (idSlug.length < 37 || idSlug[36] !== "-") notFound();
  const id = idSlug.slice(0, 36);
  if (!UUID_RE.test(id)) notFound();

  const canonicalPath = await getSchoolCanonicalPath(id, locale);
  if (!canonicalPath) notFound();

  permanentRedirect(canonicalPath);
}
