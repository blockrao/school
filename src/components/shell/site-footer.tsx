import Link from "next/link";
import { listPublicAreas } from "@/lib/db/public-adapter";
import { slugify } from "@/lib/slug";

/**
 * Only lists cities/pages with something real behind them. The design's footer includes
 * a multi-city switcher and a "Report an update" link — neither screen exists yet (not in
 * the current build order), so they're left out rather than linked to nothing. "Schools by
 * city" lists launch areas from listPublicAreas() (is_launch), not a hardcoded link. Privacy
 * and Terms are real (if placeholder-content) pages — see their own files — so they're
 * linked here now that the site is public.
 */
export async function SiteFooter({ locale }: { locale: string }) {
  const areas = await listPublicAreas();
  const launchAreas = areas.filter((a) => a.is_launch);

  return (
    <footer className="border-t border-rule bg-margin-paper px-4 pt-6 pb-24 md:px-10 md:pb-6 md:pt-10">
      <div className="mx-auto flex max-w-(--container-page) flex-col gap-7">
        <div className="grid gap-7 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-2">
            <span className="font-display text-section font-bold text-ruled-blue">SchoolOye</span>
            <p className="max-w-80 text-body text-muted-ink">
              Dates come from each school's own published notice. Sponsored listings are always
              labelled. No rankings or star ratings.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mb-1 text-meta font-semibold">Explore</span>
            <Link href={`/${locale}/schools`} className="flex min-h-8 items-center text-body">
              Schools
            </Link>
            <Link href={`/${locale}/exams`} className="flex min-h-8 items-center text-body">
              Entrance exams
            </Link>
            <Link href={`/${locale}/teachers`} className="flex min-h-8 items-center text-body">
              Teachers
            </Link>
            <Link href={`/${locale}/guides`} className="flex min-h-8 items-center text-body">
              Guides
            </Link>
            <Link href={`/${locale}/compare`} className="flex min-h-8 items-center text-body">
              Compare schools
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mb-1 text-meta font-semibold">Tools</span>
            <Link
              href={`/${locale}/tools/age-eligibility`}
              className="flex min-h-8 items-center text-body"
            >
              Check age eligibility
            </Link>
            <Link href={`/${locale}/alerts`} className="flex min-h-8 items-center text-body">
              WhatsApp alerts
            </Link>
            <Link
              href={`/${locale}/admissions/help`}
              className="flex min-h-8 items-center text-body"
            >
              Admission help
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mb-1 text-meta font-semibold">For schools</span>
            <Link href="/for-schools" className="flex min-h-8 items-center text-body">
              Claim your school free
            </Link>
          </div>
        </div>

        {launchAreas.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-rule pt-5">
            <span className="text-meta font-semibold">Schools by city</span>
            <div className="flex flex-wrap gap-x-5">
              {launchAreas.map((area) => (
                <Link
                  key={area.slug}
                  href={`/${locale}/${slugify(area.state)}/${area.slug}`}
                  className="flex min-h-8 items-center text-body"
                >
                  {area.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-rule pt-5 text-meta text-muted-ink md:flex-row md:items-center md:justify-between md:gap-6">
          <span>© 2026 SchoolOye</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href={`/${locale}/privacy`} className="min-h-8 content-center">
              Privacy
            </Link>
            <Link href={`/${locale}/terms`} className="min-h-8 content-center">
              Terms
            </Link>
            <a href="mailto:grievance@schooloye.in" className="min-h-8 content-center">
              Grievance officer: grievance@schooloye.in
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
