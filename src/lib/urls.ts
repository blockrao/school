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

/**
 * Events + news aggregator + canonical entity URLs (SEO/GEO follow-up,
 * 29 Sep 2026). Same permanent-code mechanism as teachers (D-125): editing
 * an event/post title only changes the display part of the slug, never the
 * trailing code a canonical page resolves by — see
 * 20260929050000_events_and_news_depth.sql.
 */
export function eventsRootPath(locale: string): string {
  return lp(locale, "/events");
}

export function eventPath(locale: string, slug: string): string {
  return lp(locale, `/events/${slug}`);
}

export function newsRootPath(locale: string): string {
  return lp(locale, "/news");
}

export function newsPath(locale: string, slug: string): string {
  return lp(locale, `/news/${slug}`);
}

/** The permanent event code at the end of an event slug (5 digits, 6 once 5-digit codes run out). */
export const EVENT_CODE_RE = /-(\d{5,6})$/;

export function parseEventCode(slug: string): number | null {
  const match = EVENT_CODE_RE.exec(slug);
  return match ? Number(match[1]) : null;
}

/** The permanent post code at the end of a news/press post slug. */
export const POST_CODE_RE = /-(\d{5,6})$/;

export function parsePostCode(slug: string): number | null {
  const match = POST_CODE_RE.exec(slug);
  return match ? Number(match[1]) : null;
}

/**
 * Jobs aggregator + canonical entity URLs (29 Sep 2026, 20260929060000_school_jobs.sql).
 * Same permanent-code mechanism as events/news/teachers (D-125).
 */
export function jobsRootPath(locale: string): string {
  return lp(locale, "/jobs");
}

export function jobPath(locale: string, slug: string): string {
  return lp(locale, `/jobs/${slug}`);
}

/** The permanent job code at the end of a job slug. */
export const JOB_CODE_RE = /-(\d{5,6})$/;

export function parseJobCode(slug: string): number | null {
  const match = JOB_CODE_RE.exec(slug);
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
