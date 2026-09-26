import "server-only";

/**
 * Canonical school URL: /[locale]/[citySlug]/[schoolSlug]-[schoolCode].
 * school_code (not the UUID) is the stable resolution key — see
 * db/views/010_public_schools.sql and the School Entity Page spec doc.
 */
export function schoolPath(
  locale: string,
  citySlug: string,
  school: { slug: string; school_code: number },
): string {
  return `/${locale}/${citySlug}/${school.slug}-${school.school_code}`;
}

const SCHOOL_SLUG_CODE_RE = /^(.+)-(\d{6})$/;

/**
 * Splits an `[entitySlug]` route segment into a school slug + 6-digit
 * school_code, if it looks like one. Localities never end in a bare 6-digit
 * suffix, so this is how /[locale]/[city]/[entitySlug] tells a school
 * reference apart from a locality slug without a extra DB round trip.
 */
export function parseSchoolSlugCode(entitySlug: string): { slug: string; code: number } | null {
  const match = SCHOOL_SLUG_CODE_RE.exec(entitySlug);
  if (!match) return null;
  return { slug: match[1], code: Number(match[2]) };
}
