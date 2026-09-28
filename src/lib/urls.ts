/**
 * The one place public URLs are built (docs/spec/urls-and-routing.md, D-121).
 * No page or component hand-rolls a public path; everything goes through here.
 *
 * - English lives at the root; other languages under `/{lang}/`, and only for
 *   pages that are actually translated (today: none, so `/hi/…` 404s in
 *   src/proxy.ts).
 * - Entity roots: /school/{slug}, /teacher/{…}, /exams/{slug}.
 * - Discovery: /schools/{state}/{city}/{locality}.
 *
 * Pure functions (no server-only import) so Client Components can use them too.
 */

export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

/** "" for English (root), "/hi" for Hindi, … */
export function localePrefix(locale: string): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/** Prefixes an absolute path ("/x/y") for a locale. `lp("en", "")` is "/". */
export function lp(locale: string, path = ""): string {
  const full = `${localePrefix(locale)}${path}`;
  return full === "" ? "/" : full;
}

export function homePath(locale: string): string {
  return lp(locale, "");
}

export function schoolPath(locale: string, slug: string): string {
  return lp(locale, `/school/${slug}`);
}

export function schoolViewPath(locale: string, slug: string, view: "admissions" | "fees"): string {
  return lp(locale, `/school/${slug}/${view}`);
}

export function schoolsRootPath(locale: string): string {
  return lp(locale, "/schools");
}

export function statePath(locale: string, stateSlug: string): string {
  return lp(locale, `/schools/${stateSlug}`);
}

/**
 * City base path. A city-state (Delhi) is one city whose slug is the state slug
 * (D-126): /schools/delhi, not /schools/delhi/delhi.
 */
function cityBase(stateSlug: string, citySlug: string): string {
  return stateSlug === citySlug ? `/schools/${stateSlug}` : `/schools/${stateSlug}/${citySlug}`;
}

export function cityPath(locale: string, stateSlug: string, citySlug: string): string {
  return lp(locale, cityBase(stateSlug, citySlug));
}

export function localityPath(
  locale: string,
  stateSlug: string,
  citySlug: string,
  localitySlug: string,
): string {
  return lp(locale, `${cityBase(stateSlug, citySlug)}/${localitySlug}`);
}

export function examPath(locale: string, slug: string): string {
  return lp(locale, `/exams/${slug}`);
}

/**
 * Teacher canonical URL: /teacher/{first-middle-last}-{teacher_code} (D-125).
 * `slug` is teachers.slug, which already ends in the permanent teacher code.
 */
export function teacherPath(locale: string, slug: string): string {
  return lp(locale, `/teacher/${slug}`);
}

/** The permanent teacher code at the end of a teacher slug (5 digits, 6 once 5-digit codes run out). */
export const TEACHER_CODE_RE = /-(\d{5,6})$/;

export function parseTeacherCode(slug: string): number | null {
  const match = TEACHER_CODE_RE.exec(slug);
  return match ? Number(match[1]) : null;
}

/** Archive view year segment: exactly YYYY-YY (D-121 §4). */
export const ARCHIVE_YEAR_RE = /^\d{4}-\d{2}$/;

/**
 * Words that can never be a school slug (D-121 §3). Mirrors the SQL array in
 * public.is_reserved_school_slug() — src/lib/urls.test.ts keeps them identical.
 * State, city and locality slugs are reserved dynamically in SQL.
 */
export const SCHOOL_RESERVED_SLUGS = [
  "admissions",
  "fees",
  "teachers",
  "new",
  "search",
  "compare",
  "edit",
  "claim",
  "index",
  "api",
  "admin",
  "sitemap",
  "school",
  "schools",
  "exams",
  "teacher",
  "en",
  "hi",
  "bn",
  "ta",
  "te",
  "mr",
  "gu",
  "kn",
  "ml",
  "pa",
  "ur",
  "or",
  "as",
] as const;

/** Entity-slug format (D-121 §3). */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX = 60;

export function isValidEntitySlug(slug: string): boolean {
  return slug.length <= SLUG_MAX && SLUG_RE.test(slug);
}
