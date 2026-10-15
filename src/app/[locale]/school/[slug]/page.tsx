import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { schoolPath } from "@/lib/urls";
import { SchoolView, schoolMetadata } from "../../_views/entity-page";
import { resolveSchoolSlug } from "../../_views/resolve";

// The page is cached and refreshed on this window, so a freshly-added admission
// cycle, event, news post or job appears within 15 minutes. (It no longer reads
// searchParams or cookies: per-visitor state loads in the browser, see
// components/school/.)
export const revalidate = 900;

// No school is prerendered at build time (there are thousands, and they change),
// but declaring the segment's params makes Next treat the route as ISR: each
// page is rendered on first request, then served from cache and refreshed in
// the background every `revalidate` seconds. Without this the route is marked
// dynamic and every crawler hit renders from scratch.
export function generateStaticParams() {
  return [];
}

/**
 * Canonical school entity page: /school/{slug} (D-121, docs/spec/urls-and-routing.md).
 * The slug is the permanent public locator. Alias, retired and merged slugs,
 * and the legacy /school/{uuid}-{slug} form, 301 here in one hop.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/school/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await resolveSchoolSlug(slug);
  if (result?.kind !== "school") return { title: "Not found" };
  return schoolMetadata(locale, result.resolved);
}

export default async function SchoolPage({ params }: PageProps<"/[locale]/school/[slug]">) {
  const { locale, slug } = await params;
  const result = await resolveSchoolSlug(slug);
  if (!result) notFound();
  if (result.kind === "redirect") permanentRedirect(schoolPath(locale, result.slug));

  const closed = result.resolved.bundle.school.status === "closed";
  return (
    <>
      {closed && (
        <p
          role="status"
          className="mx-auto mt-4 max-w-(--container-page) rounded-md border border-rule bg-margin-paper px-4 py-3 text-body md:px-10"
        >
          This school has closed. The details below are kept as a record and are no longer updated.
        </p>
      )}
      <SchoolView locale={locale} resolved={result.resolved} />
    </>
  );
}
