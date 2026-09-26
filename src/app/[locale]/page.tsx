import type { Metadata } from "next";
import { localeAlternates, localeCanonical } from "@/lib/seo";
import Form from "next/form";
import Link from "next/link";
import { StatusPill } from "@/components/ui/badges";
import { deadlineMarginStatusClasses } from "@/components/ui/deadline-margin";
import { EmptyState } from "@/components/ui/state-message";
import {
  getSelectedCityArea,
  listOpenAdmissionsByDistrict,
  listPublicBoards,
  listPublicSchoolsByDistrict,
  type PublicOpenAdmission,
} from "@/lib/db/public-adapter";
import { deadlineState } from "@/lib/deadline";
import { schoolPath } from "@/lib/school-url";
import { cn } from "@/lib/utils";

// South West Delhi stays built but unlinked — see CLAUDE.md. Which city renders
// here is resolved per-request (see getSelectedCityArea): the user's own pick if
// they've chosen one, otherwise the platform default.
export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const area = await getSelectedCityArea();
  const label = area?.cityName ?? "your city";
  return {
    title: `Find the right school in ${label} — SchoolOye`,
    description: `Search and compare schools in ${label}: fees, facilities and admission dates in one place.`,
    alternates: {
      canonical: localeCanonical(locale),
      languages: localeAlternates(),
    },
  };
}

function admissionPillStatus(status: ReturnType<typeof deadlineState>["status"]) {
  return status === "closing-soon" || status === "deadline-day" ? "closing-soon" : "open";
}

function AdmissionRow({
  admission,
  citySlug,
  locale,
  now,
}: {
  admission: PublicOpenAdmission;
  citySlug: string;
  locale: string;
  now: Date;
}) {
  const state = deadlineState(
    { closesAt: admission.closesOn ? new Date(admission.closesOn) : null },
    now,
  );
  const pillStatus = admissionPillStatus(state.status);

  return (
    <Link
      href={schoolPath(locale, citySlug, {
        slug: admission.slug,
        school_code: admission.schoolCode,
      })}
      className="flex min-h-17 border-b border-rule-soft hover:bg-margin-paper"
    >
      <div
        className={cn(
          "flex w-18 shrink-0 flex-col justify-center gap-0.5 border-r-2 py-2 pr-1.5 text-meta",
          deadlineMarginStatusClasses[state.status],
        )}
      >
        <span>{state.top}</span>
        <span className="font-display text-section font-bold leading-none">{state.big}</span>
        <span>{state.bottom}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pl-3">
        <span className="truncate font-display text-card font-semibold">{admission.nameEn}</span>
        <StatusPill status={pillStatus} className="self-start">
          {pillStatus === "closing-soon" ? "Closing soon" : "Open"}
        </StatusPill>
      </div>
    </Link>
  );
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const now = new Date();

  const area = await getSelectedCityArea();

  const [schoolsResult, openAdmissions, boards] = area
    ? await Promise.all([
        listPublicSchoolsByDistrict(area.districtId, { pageSize: 1 }),
        listOpenAdmissionsByDistrict(area.districtId, 3),
        listPublicBoards(),
      ])
    : [{ total: 0 }, [], []];

  const schoolCount = schoolsResult.total;
  const districtLabel = area?.cityName ?? "your city";
  const districtHref = area ? `/${locale}/${area.citySlug}` : `/${locale}/schools`;

  // Category chips reflect real filterable boards, not a fixed design list — the set
  // grows automatically as more boards get affiliations in this district.
  const cbse = boards.find((b) => b.name_en.includes("Central Board"));

  return (
    <div className="mx-auto max-w-(--container-page)">
      <div className="flex flex-col gap-4.5 border-b border-rule px-4 py-8 md:px-10 md:py-12">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-title-m md:text-title-d">
            Find the right school in {districtLabel}
          </h1>
          <p className="text-body text-muted-ink md:text-card">
            {schoolCount} school{schoolCount === 1 ? "" : "s"} · fees, facilities and admission
            dates in one place
          </p>
        </div>

        <Form
          action={`/${locale}/schools`}
          className="flex h-13 items-stretch overflow-hidden rounded-md border border-line-blue-strong bg-copy-white md:h-15 md:max-w-(--container-read)"
        >
          <label className="flex min-w-0 flex-1 items-center gap-2.5 px-4">
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="shrink-0 text-slate"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l5 5" />
            </svg>
            <span className="sr-only">School name or area</span>
            <input
              type="search"
              name="q"
              placeholder="School name or area"
              className="w-full min-w-0 bg-transparent text-body outline-none placeholder:text-slate md:text-card"
            />
          </label>
          <button type="submit" className="bg-ruled-blue px-6 font-semibold text-copy-white">
            Search
          </button>
        </Form>

        <div className="flex flex-wrap gap-2">
          <Link
            href={districtHref}
            className="flex min-h-10 items-center rounded-md border border-rule bg-copy-white px-3 text-body font-medium hover:border-ruled-blue"
          >
            All schools
          </Link>
          {cbse && (
            <Link
              href={`${districtHref}?board=${cbse.id}`}
              className="flex min-h-10 items-center rounded-md border border-rule bg-copy-white px-3 text-body font-medium hover:border-ruled-blue"
            >
              CBSE schools
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-6 md:px-10 md:py-9">
        <div className="flex items-baseline justify-between gap-2 border-b border-rule pb-2">
          <h2 className="font-display text-card md:text-section">Admissions open now</h2>
          <Link href={districtHref} className="font-semibold text-body">
            See all {schoolCount}
          </Link>
        </div>

        {openAdmissions.length > 0 ? (
          <div className="flex flex-col">
            {openAdmissions.map((admission) => (
              <AdmissionRow
                key={admission.schoolId}
                admission={admission}
                citySlug={area?.citySlug ?? ""}
                locale={locale}
                now={now}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open admission windows yet"
            description="Schools publish their own dates — check back soon, or browse every school in the meantime."
            nextStepLabel={`Browse all schools in ${districtLabel}`}
            nextStepHref={districtHref}
          />
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-6 md:px-10 md:py-9">
        <h2 className="font-display text-card md:text-section">Tools</h2>
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3">
          {[
            {
              title: "Check age eligibility",
              description: "Which class your child can apply for",
              href: `/${locale}/tools/age-eligibility`,
            },
            {
              title: "Compare schools",
              description: "Fees, facilities and dates side by side",
              href: `/${locale}/compare`,
            },
            {
              title: "Get WhatsApp alerts",
              description: "When forms open and before they close",
              href: `/${locale}/alerts`,
            },
          ].map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex min-h-15 items-center justify-between gap-3 rounded-md border border-line-blue bg-copy-white px-3.5 py-3 hover:border-ruled-blue"
            >
              <span className="flex flex-col">
                <span className="font-display text-card font-semibold text-ruled-blue">
                  {tool.title}
                </span>
                <span className="text-body text-muted-ink">{tool.description}</span>
              </span>
              <span aria-hidden="true" className="text-card text-ruled-blue">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 py-6 md:px-10 md:py-9">
        <Link
          href={`/${locale}/exams`}
          className="flex items-center justify-between gap-3 rounded-md border border-rule bg-copy-white px-4 py-3.5 hover:border-ruled-blue"
        >
          <span className="flex flex-col">
            <span className="font-display text-card font-semibold">Entrance exams</span>
            <span className="text-body text-muted-ink">
              Eligibility, dates and fees for RMS CET and other exams — verified against the
              official notification
            </span>
          </span>
          <span aria-hidden="true" className="text-card text-ruled-blue">
            →
          </span>
        </Link>

        <Link
          href={`/${locale}/guides`}
          className="flex items-center justify-between gap-3 rounded-md border border-rule bg-copy-white px-4 py-3.5 hover:border-ruled-blue"
        >
          <span className="flex flex-col">
            <span className="font-display text-card font-semibold">Guides</span>
            <span className="text-body text-muted-ink">
              Admission process, documents, and how boards differ
            </span>
          </span>
          <span aria-hidden="true" className="text-card text-ruled-blue">
            →
          </span>
        </Link>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-10 md:flex-row md:items-center md:justify-between md:gap-6 md:px-10 md:pb-12">
        <p className="border-l-2 border-ruled-blue bg-pill-results-bg py-1.5 pl-3 text-body">
          Dates come from each school's own published notice · Sponsored listings are always
          labelled.
        </p>
        <div className="flex items-center justify-between gap-4 rounded-md border border-rule px-4 py-3.5 md:justify-start md:border-0 md:p-0">
          <span className="font-display text-card font-semibold">Is your school listed?</span>
          <Link href="/for-schools" className="font-semibold text-ruled-blue">
            Claim it free →
          </Link>
        </div>
      </div>
    </div>
  );
}
