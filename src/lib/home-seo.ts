/**
 * Homepage SEO constants and structured data. Lives outside page.tsx because
 * App Router page files may only export the Next.js route conventions
 * (default, metadata, generateMetadata, revalidate ...) — anything else
 * fails `next typegen`. Pure, no server-only imports, so it's unit-testable.
 */

export const HOME_TITLE = "Find the right CBSE or ICSE school — SchoolOye";
export const HOME_DESCRIPTION =
  "Search and compare CBSE and ICSE schools across Haryana, Delhi and Jaipur: admissions, school facts and contact details in one place.";

/**
 * Organization + WebSite structured data for the homepage (none existed
 * before 4 Oct 2026; school pages already emit WebPage/School/BreadcrumbList).
 * WebSite.potentialAction mirrors the real search form below, which submits
 * `q` to /schools. Kept as a plain function of siteUrl so it's testable.
 */
export function homeJsonLd(siteUrl: string) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "SchoolOye",
    url: siteUrl,
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "SchoolOye",
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/schools?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return [organization, website];
}
