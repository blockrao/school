import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { schoolPath } from "@/lib/urls";
import { SchoolView, schoolMetadata } from "../../_views/entity-page";
import { resolveSchoolSlug } from "../../_views/resolve";

// Reading searchParams already forces this route to render per-request, but
// that doesn't cache-bust the underlying Supabase fetch() calls on their
// own — without an explicit revalidate they're still served from Next's
// persistent Data Cache, so a freshly-added admission cycle, event, news
// post or job (all read here for "What's happening"/Admissions) could sit
// invisible on an already-rendered school page until the next deploy. Same
// reasoning/window as exams/page.tsx and the events/news/jobs pages.
export const revalidate = 900;

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

export default async function SchoolPage({
  params,
  searchParams,
}: PageProps<"/[locale]/school/[slug]">) {
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
      <SchoolView locale={locale} resolved={result.resolved} rawSearchParams={await searchParams} />
    </>
  );
}
