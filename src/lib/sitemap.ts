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
export const LAUNCH_CITY_SLUGS = ["jaipur", "gurugram"];

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * One <url> entry, English canonical with an English/Hindi hreflang pair —
 * shared by every sitemap-*.xml route (LAUNCH_CITY_SLUGS' city sitemaps and
 * sitemap-site.xml) so they stay byte-identical in shape. `path` is locale-free
 * (e.g. "/exams/rms-cet", not "/en/exams/rms-cet").
 */
export function urlEntry(siteUrl: string, path: string, lastModified?: Date): string {
  const en = xmlEscape(`${siteUrl}/en${path}`);
  const hi = xmlEscape(`${siteUrl}/hi${path}`);
  const lastmod = lastModified ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>` : "";
  return `  <url>
    <loc>${en}</loc>${lastmod}
    <xhtml:link rel="alternate" hreflang="en-IN" href="${en}" />
    <xhtml:link rel="alternate" hreflang="hi-IN" href="${hi}" />
  </url>`;
}

/** Wraps a list of urlEntry() strings in the sitemap urlset envelope. */
export function urlSetXml(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}
