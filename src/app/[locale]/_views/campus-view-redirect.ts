import { notFound, permanentRedirect } from "next/navigation";
import { ARCHIVE_YEAR_RE, schoolPath } from "@/lib/urls";
import { resolveSchoolSlug } from "./resolve";

/** Parent-page anchor each campus view falls back to while below its threshold (D-121 §4). */
const VIEW_ANCHOR = { admissions: "#admissions-heading", fees: "" } as const;

/**
 * Campus views (/school/{slug}/admissions, /fees and their /{yyyy-yy}
 * archives) are reserved routes (D-121 §4). No view has crossed its
 * completeness threshold yet (phase 2 of the URL spec builds the
 * completeness engine), so every valid request is "never indexed, below
 * threshold" → one 301 to the canonical parent's section anchor.
 * Malformed years (not YYYY-YY) and unknown schools are 404.
 */
export async function redirectCampusView(
  locale: string,
  slug: string,
  view: keyof typeof VIEW_ANCHOR,
  year?: string,
): Promise<never> {
  if (year !== undefined && !ARCHIVE_YEAR_RE.test(year)) notFound();
  const result = await resolveSchoolSlug(slug);
  if (!result) notFound();
  const canonicalSlug =
    result.kind === "redirect" ? result.slug : result.resolved.bundle.school.slug;
  permanentRedirect(`${schoolPath(locale, canonicalSlug)}${VIEW_ANCHOR[view]}`);
}
