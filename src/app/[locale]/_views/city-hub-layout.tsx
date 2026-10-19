/**
 * Enhanced City Hub Page Layout
 * Replaces the generic place-page layout for city hub view (/)
 * Purpose: Give users a clear entry point to explore schools in a city
 *
 * Sections (rendered in order):
 * 1. Hero: City name, school count, admission status
 * 2. Browse by Locality: Card grid of localities with school counts
 * 3. Featured Schools: Top-rated schools in this city
 * 4. Active Admissions: Schools with open/closing-soon cycles
 * 5. By Board: Browse schools grouped by board (CBSE, ICSE, etc.)
 * 6. City Highlights: News, events, jobs (existing CityHighlights component)
 */

import Link from "next/link";
import { useMemo } from "react";
import { SchoolCard } from "@/components/ui/school-card";
import { StatusPill } from "@/components/ui/badges";
import { EmptyState } from "@/components/ui/state-message";
import {
  type PublicCityArea,
  listPublicLocalitiesByCity,
  listPublicSchoolsByDistrict,
  getBoardNamesBySchoolId,
  getAdmissionDeadlinesBySchoolId,
} from "@/lib/db/public-adapter";
import { boardShortName } from "@/lib/board-slug";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { formatGradeRange } from "@/lib/grades";
import { schoolPath, localityPath, cityPath } from "@/lib/urls";

type LocalityCardProps = {
  locale: string;
  stateSlug: string;
  citySlug: string;
  localitySlug: string;
  localityName: string;
  schoolCount: number;
};

function LocalityCard({
  locale,
  stateSlug,
  citySlug,
  localitySlug,
  localityName,
  schoolCount,
}: LocalityCardProps) {
  const href = localityPath(locale, stateSlug, citySlug, localitySlug);
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-md border border-rule bg-copy-white p-4 transition hover:border-ruled-blue hover:bg-sky-50"
    >
      <h3 className="text-body font-semibold text-ink">{localityName}</h3>
      <p className="text-meta text-muted-ink">
        {schoolCount} school{schoolCount === 1 ? "" : "s"}
      </p>
      <p className="text-body font-medium text-ruled-blue">Browse →</p>
    </Link>
  );
}

/**
 * Builds the hub intro from real counts only. Every number here must come from
 * a full-city query (not a page slice), so the text never contradicts the lists
 * on the page. Returns null when there is nothing honest to say.
 */
export function buildCityIntro({
  cityName,
  schoolCount,
  areaCount,
  boardGroups,
  openAdmissionsCount,
  gradeBands,
}: {
  cityName: string;
  gradeBands?: { endsByClass5: number; endsByClass8: number; endsByClass10: number; endsByClass12: number };
  schoolCount: number;
  areaCount: number;
  boardGroups: Array<{ boardName: string; schoolCount: number }>;
  openAdmissionsCount: number;
}): string | null {
  if (schoolCount <= 0) return null;

  const sentences: string[] = [];
  const areaPart =
    areaCount > 0 ? `, spread across ${areaCount} ${areaCount === 1 ? "area" : "areas"}` : "";
  sentences.push(
    `${cityName} has ${schoolCount} ${schoolCount === 1 ? "school" : "schools"} listed on SchoolOye${areaPart}.`
  );

  if (boardGroups.length > 0) {
    const top = [...boardGroups].sort((a, b) => b.schoolCount - a.schoolCount)[0];
    sentences.push(
      `${boardGroups.length} ${boardGroups.length === 1 ? "board is" : "boards are"} represented, most commonly ${top.boardName} (${top.schoolCount} ${top.schoolCount === 1 ? "school" : "schools"}).`
    );
  }

  if (gradeBands) {
    const known =
      gradeBands.endsByClass5 + gradeBands.endsByClass8 + gradeBands.endsByClass10 + gradeBands.endsByClass12;
    if (known > 0) {
      sentences.push(
        `Of the ${known} with a published class range, ${gradeBands.endsByClass5} end at Class 5 or below, ${gradeBands.endsByClass8} at Class 8, ${gradeBands.endsByClass10} at Class 10 and ${gradeBands.endsByClass12} at Class 12.`
      );
    }
  }

  if (openAdmissionsCount > 0) {
    sentences.push(
      `${openAdmissionsCount} ${openAdmissionsCount === 1 ? "school has" : "schools have"} admissions open right now.`
    );
  }

  return sentences.join(" ");
}

type CityHubLayoutProps = {
  locale: string;
  city: PublicCityArea;
  openAdmissionsCount: number;
  gradeBands: { endsByClass5: number; endsByClass8: number; endsByClass10: number; endsByClass12: number };
  featuredSchools: Array<{
    id: string;
    name_en: string | null;
    slug: string;
    min_class: string | null;
    max_class: string | null;
    rating: number | null;
    review_count: number | null;
  }>;
  activeAdmissions: Array<{
    id: string;
    name_en: string | null;
    slug: string;
    active_admission_count: number;
  }>;
  localities: Array<{
    id: number;
    name: string;
    slug: string;
    schoolCount: number;
  }>;
  boardGroups: Array<{
    boardId: number;
    boardName: string;
    schoolCount: number;
    exampleSchools: string[];
  }>;
  now: Date;
};

/**
 * City hub layout: guided discovery instead of immediate full listing
 * Helps users answer: "Where should I look first?"
 *
 * Locality cards help us research: do users click these to filter, or skip to search?
 * (This data will inform Week 2 decision on locality hub pages)
 */
export function CityHubLayout({
  locale,
  city,
  openAdmissionsCount,
  gradeBands,
  featuredSchools,
  activeAdmissions,
  localities,
  boardGroups,
  now,
}: CityHubLayoutProps) {
  const intro = buildCityIntro({
    cityName: city.cityName,
    schoolCount: city.schoolCount,
    areaCount: localities.length,
    boardGroups,
    openAdmissionsCount,
    gradeBands,
  });
  return (
    <div className="mx-auto max-w-(--container-page) space-y-8 px-4 py-6 md:px-10 md:py-9">
      {/* ============================================================================
          HERO SECTION
          ============================================================================ */}
      <section className="space-y-2">
        <h1 className="font-display text-title-m md:text-title-d">
          Schools in {city.cityName}
        </h1>
        <p className="text-body text-muted-ink">
          {intro ??
            `${city.schoolCount} school${city.schoolCount === 1 ? "" : "s"} across ${localities.length} ${localities.length === 1 ? "area" : "areas"}`}
        </p>
      </section>

      {/* ============================================================================
          BROWSE BY LOCALITY
          ============================================================================
          This is the key research section: Do users click into localities, or jump
          to search? We'll track clicks to decide if standalone locality hub pages
          are worth the SEO/maintenance burden.
      */}
      {localities.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-card md:text-section font-semibold">
              Browse by area
            </h2>
            <p className="text-body text-muted-ink">{localities.length} areas</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {localities.map((locality) => (
              <LocalityCard
                key={locality.id}
                locale={locale}
                stateSlug={city.stateSlug}
                citySlug={city.citySlug}
                localitySlug={locality.slug}
                localityName={locality.name}
                schoolCount={locality.schoolCount}
              />
            ))}
          </div>
          <p className="pt-2 text-meta text-muted-ink">
            Can't find your area? <Link href={`${cityPath(locale, city.stateSlug, city.citySlug)}?page=1`} className="font-semibold text-ruled-blue">See all schools →</Link>
          </p>
        </section>
      )}

      {/* ============================================================================
          FEATURED SCHOOLS (Top-Rated)
          ============================================================================ */}
      {featuredSchools.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-card md:text-section font-semibold">
              Featured schools
            </h2>
            <Link
              href={`${cityPath(locale, city.stateSlug, city.citySlug)}?page=1`}
              className="text-body font-semibold text-ruled-blue"
            >
              See all →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {featuredSchools.slice(0, 6).map((school) => {
              const grades = formatGradeRange(school.min_class, school.max_class);
              const rating = school.rating
                ? `${school.rating.toFixed(1)} ⭐ (${school.review_count} reviews)`
                : "Not yet rated";
              return (
                <Link
                  key={school.id}
                  href={schoolPath(locale, school.slug)}
                  className="flex flex-col gap-2 rounded-md border border-rule bg-copy-white p-4 transition hover:border-ruled-blue hover:shadow-sm"
                >
                  <h3 className="font-semibold text-ink line-clamp-2">{school.name_en}</h3>
                  <p className="text-meta text-muted-ink">{grades}</p>
                  <p className="text-body font-medium text-ruled-blue">{rating}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================================
          ACTIVE ADMISSIONS
          ============================================================================
          Schools with open/closing-soon admission cycles (powered by denormalized
          active_admission_count column from Week 1)
      */}
      {activeAdmissions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-card md:text-section font-semibold">
              Admissions open right now
            </h2>
            <p className="text-body text-muted-ink">{activeAdmissions.length} schools</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activeAdmissions.slice(0, 6).map((school) => (
              <Link
                key={school.id}
                href={schoolPath(locale, school.slug)}
                className="flex flex-col gap-2 rounded-md border border-green-200 bg-green-50 p-4 transition hover:border-green-400 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <h3 className="flex-1 font-semibold text-ink line-clamp-2">
                    {school.name_en}
                  </h3>
                  <StatusPill status="open">Open</StatusPill>
                </div>
                <p className="text-meta text-muted-ink">
                  {school.active_admission_count} class
                  {school.active_admission_count === 1 ? "" : "es"} taking admissions
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================================
          BROWSE BY BOARD
          ============================================================================
          CBSE, ICSE, State Board, etc. — helps users navigate by curriculum
      */}
      {boardGroups.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-card md:text-section font-semibold">
              Browse by board
            </h2>
            <p className="text-body text-muted-ink">{boardGroups.length} boards</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boardGroups.map((board) => (
              <Link
                key={board.boardId}
                href={`${cityPath(locale, city.stateSlug, city.citySlug)}/${boardShortName(board.boardName).toLowerCase()}-schools`}
                className="flex flex-col gap-2 rounded-md border border-rule bg-copy-white p-4 transition hover:border-ruled-blue hover:bg-sky-50"
              >
                <h3 className="text-body font-semibold text-ink">{board.boardName}</h3>
                <p className="text-meta text-muted-ink">
                  {board.schoolCount} school{board.schoolCount === 1 ? "" : "s"}
                </p>
                <p className="text-body font-medium text-ruled-blue">Browse →</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================================
          CTA: Go to Full Listing
          ============================================================================ */}
      <div className="flex gap-2">
        <Link
          href={`${cityPath(locale, city.stateSlug, city.citySlug)}?page=1`}
          className="inline-flex h-12 items-center rounded-md bg-ruled-blue px-6 font-semibold text-white transition hover:bg-blue-700"
        >
          See all schools ({city.schoolCount})
        </Link>
      </div>
    </div>
  );
}
