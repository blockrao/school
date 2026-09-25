import Link from "next/link";
import { listPublicAreas } from "@/lib/db/public-adapter";
import { slugify } from "@/lib/slug";

/**
 * Only lists cities/pages with something real behind them. The design's footer includes
 * About our data / Privacy / Contact / Report-an-update links and a multi-city switcher —
 * none of those screens exist yet (not in the current build order), so they're left out
 * rather than linked to nothing. "Schools by city" lists launch areas from
 * listPublicAreas() (is_launch), not a hardcoded link.
 */
export async function SiteFooter({ locale }: { locale: string }) {
  const areas = await listPublicAreas();
  const launchAreas = areas.filter((a) => a.is_launch);

  return (
    <footer className="border-t border-rule bg-margin-paper px-4 pt-6 pb-24 md:px-10 md:pb-6 md:pt-10">
      <div className="mx-auto flex max-w-(--container-page) flex-col gap-7">
        <div className="grid gap-7 md:grid-cols-[1.4fr_1fr_1fr]">
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
            <Link href={`/${locale}/teachers`} className="flex min-h-8 items-center text-body">
              Teachers
            </Link>
            <Link href={`/${locale}/guides`} className="flex min-h-8 items-center text-body">
              Guides
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

        <div className="flex flex-col gap-1 text-meta text-muted-ink md:flex-row md:justify-between">
          <span>© 2026 SchoolOye</span>
          <a href="mailto:grievance@schooloye.in">Grievance officer: grievance@schooloye.in</a>
        </div>
      </div>
    </footer>
  );
}
