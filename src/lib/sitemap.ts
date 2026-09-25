import "server-only";

/**
 * One entry per launched city, each with its own child sitemap route
 * (`src/app/sitemap-<slug>.xml/route.ts`) and a matching line in the index
 * (`src/app/sitemap.xml/route.ts`). Same pattern/sync-reminder as
 * LAUNCH_DISTRICT_SLUGS in public-adapter.ts and DISTRICT_SLUG on the home and
 * teacher-create pages. A literal per-city route file (not a dynamic segment)
 * because Next.js App Router doesn't support a folder name that mixes a
 * literal `.xml` suffix with a dynamic segment (`sitemap-[city].xml`).
 */
export const LAUNCH_CITY_SLUGS = ["jaipur"];

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
