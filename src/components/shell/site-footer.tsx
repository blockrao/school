import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionary";
import { t } from "@/i18n/t";
import { listPublicAreas } from "@/lib/db/public-adapter";
import { cityPath, localePrefix } from "@/lib/urls";

/**
 * Only lists cities/pages with something real behind them. The design's footer includes
 * a multi-city switcher and a "Report an update" link — neither screen exists yet (not in
 * the current build order), so they're left out rather than linked to nothing. "Schools by
 * city" lists launch areas from listPublicAreas() (is_launch), not a hardcoded link — this
 * grew from 2 to 22 cities on 2026-09-28 when is_launch became data-driven (see
 * db/views/040_public_areas.sql), so cities are now grouped by state and sorted by school
 * count within each group, rather than the flat unsorted list that worked fine at 2 entries.
 * Privacy and Terms are real (if placeholder-content) pages — see their own files — so
 * they're linked here now that the site is public.
 */
export async function SiteFooter({ locale, dict }: { locale: string; dict: Dictionary }) {
  const areas = await listPublicAreas();
  const launchAreas = areas
    .filter((a) => a.is_launch)
    .sort((a, b) => b.school_count - a.school_count);
  const areasByState = new Map<string, typeof launchAreas>();
  for (const area of launchAreas) {
    const group = areasByState.get(area.state);
    if (group) {
      group.push(area);
    } else {
      areasByState.set(area.state, [area]);
    }
  }

  return (
    // V2 visual foundation (Increment 9): the other half of the migrated
    // global shell boundary, matching SiteHeader's tokens.
    <footer className="border-t border-so-line bg-so-sunk px-4 pt-6 pb-24 font-so-sans text-so-ink md:px-10 md:pb-6 md:pt-10">
      <div className="mx-auto flex max-w-(--container-page) flex-col gap-7">
        <div className="grid gap-7 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-2">
            <span className="text-section font-bold text-so-accent">{t(dict, "common.brand")}</span>
            <p className="max-w-80 text-body text-so-ink3">{t(dict, "footer.tagline")}</p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mb-1 text-meta font-semibold text-so-ink">
              {t(dict, "footer.explore_heading")}
            </span>
            <Link
              href={`${localePrefix(locale)}/schools`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.schools")}
            </Link>
            <Link
              href={`${localePrefix(locale)}/exams`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.entrance_exams")}
            </Link>
            <Link
              href={`${localePrefix(locale)}/teachers`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.teachers")}
            </Link>
            <Link
              href={`${localePrefix(locale)}/guides`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.guides")}
            </Link>
            <Link
              href={`${localePrefix(locale)}/compare`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.compare_schools")}
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mb-1 text-meta font-semibold text-so-ink">
              {t(dict, "footer.tools_heading")}
            </span>
            <Link
              href={`${localePrefix(locale)}/tools/age-eligibility`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.check_age_eligibility")}
            </Link>
            <Link
              href={`${localePrefix(locale)}/alerts`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.whatsapp_alerts")}
            </Link>
            <Link
              href={`${localePrefix(locale)}/admissions/help`}
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.admission_help")}
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mb-1 text-meta font-semibold text-so-ink">
              {t(dict, "footer.for_schools_heading")}
            </span>
            <Link
              href="/for-schools"
              className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.claim_school_free")}
            </Link>
          </div>
        </div>

        {launchAreas.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-so-line pt-5">
            <span className="text-meta font-semibold text-so-ink">
              {t(dict, "footer.schools_by_city")}
            </span>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(areasByState.entries()).map(([state, stateAreas]) => (
                <div key={state} className="flex flex-col gap-1.5">
                  <span className="text-meta text-so-ink3">{state}</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {stateAreas.map((area) => (
                      <Link
                        key={area.slug}
                        href={cityPath(locale, area.state_slug, area.slug)}
                        className="flex min-h-8 items-center text-body text-so-ink hover:text-so-accent focus-visible:outline-so-accent"
                      >
                        {area.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-so-line pt-5 text-meta text-so-ink3 md:flex-row md:items-center md:justify-between md:gap-6">
          <span>{t(dict, "footer.copyright", { year: 2026 })}</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link
              href={`${localePrefix(locale)}/privacy`}
              className="min-h-8 content-center text-so-ink3 hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.privacy")}
            </Link>
            <Link
              href={`${localePrefix(locale)}/terms`}
              className="min-h-8 content-center text-so-ink3 hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.terms")}
            </Link>
            <a
              href="mailto:grievance@schooloye.in"
              className="min-h-8 content-center text-so-ink3 hover:text-so-accent focus-visible:outline-so-accent"
            >
              {t(dict, "footer.grievance_officer", { email: "grievance@schooloye.in" })}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
