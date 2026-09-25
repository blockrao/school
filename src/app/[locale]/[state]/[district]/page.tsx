import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/ui/badges";
import { NotYetPublished } from "@/components/ui/freshness-line";
import { SchoolCard } from "@/components/ui/school-card";
import { EmptyState } from "@/components/ui/state-message";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getPublicAreaBySlug,
  getPublicDistrictBySlug,
  getPublicStateBySlug,
  listDistrictFilterOptions,
  listPublicSchoolsByDistrict,
} from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { formatGradeRange } from "@/lib/grades";

const PAGE_SIZE = 24;

function parseFilters(searchParams: { [key: string]: string | string[] | undefined }) {
  const boardParam = Array.isArray(searchParams.board) ? searchParams.board[0] : searchParams.board;
  const gradeParam = Array.isArray(searchParams.grade) ? searchParams.grade[0] : searchParams.grade;
  const admissionsParam = Array.isArray(searchParams.admissions)
    ? searchParams.admissions[0]
    : searchParams.admissions;
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;

  const boardId = boardParam ? Number(boardParam) : undefined;
  const maxClass = gradeParam || undefined;
  const admissionsOpen = admissionsParam === "open";
  const page = pageParam ? Math.max(1, Number(pageParam) || 1) : 1;

  return { boardId, maxClass, admissionsOpen, page };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/[state]/[district]">): Promise<Metadata> {
  const { state: stateSlug, district: districtSlug } = await params;
  const [district, state, area] = await Promise.all([
    getPublicDistrictBySlug(districtSlug),
    getPublicStateBySlug(stateSlug),
    getPublicAreaBySlug(districtSlug),
  ]);

  if (!district || !state || district.state_id !== state.id || !area || !area.is_launch) {
    return { title: "Not found" };
  }

  const rawSearchParams = await searchParams;
  const { boardId, maxClass, admissionsOpen } = parseFilters(rawSearchParams);
  const filtersActive = boardId !== undefined || maxClass !== undefined || admissionsOpen;
  const districtLabel = area.name;

  return {
    title: `${districtLabel} schools — SchoolOye`,
    description: `Browse schools in ${districtLabel}, ${area.state}: fees, facilities and admission dates.`,
    alternates: { canonical: `/${stateSlug}/${districtSlug}` },
    // Filtered combinations are dynamic and near-duplicate content — keep only the
    // unfiltered listing indexable.
    robots: filtersActive ? { index: false, follow: true } : undefined,
  };
}

export default async function DistrictPage({
  params,
  searchParams,
}: PageProps<"/[locale]/[state]/[district]">) {
  const { locale, state: stateSlug, district: districtSlug } = await params;
  const rawSearchParams = await searchParams;
  const now = new Date();

  const [district, state, area] = await Promise.all([
    getPublicDistrictBySlug(districtSlug),
    getPublicStateBySlug(stateSlug),
    getPublicAreaBySlug(districtSlug),
  ]);

  if (!district || !state || district.state_id !== state.id || !area || !area.is_launch) {
    notFound();
  }

  const { boardId, maxClass, admissionsOpen, page } = parseFilters(rawSearchParams);
  const filtersActive = boardId !== undefined || maxClass !== undefined || admissionsOpen;
  const districtLabel = area.name;

  const [{ schools, total }, filterOptions] = await Promise.all([
    listPublicSchoolsByDistrict(district.id, {
      boardId,
      maxClass,
      admissionsOpen,
      page,
      pageSize: PAGE_SIZE,
    }),
    listDistrictFilterOptions(district.id),
  ]);

  const schoolIds = schools.map((s) => s.id);
  const [boardNames, admissionDeadlines] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const basePath = `/${locale}/${stateSlug}/${districtSlug}`;

  function pageHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (boardId !== undefined) qs.set("board", String(boardId));
    if (maxClass) qs.set("grade", maxClass);
    if (admissionsOpen) qs.set("admissions", "open");
    if (targetPage > 1) qs.set("page", String(targetPage));
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: area.state, item: `/${locale}/${stateSlug}` },
      { "@type": "ListItem", position: 2, name: districtLabel, item: basePath },
    ],
  };

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-body text-muted-ink">
        <span>{area.state}</span>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{districtLabel}</span>
      </nav>

      <h1 className="font-display text-title-m md:text-title-d">{districtLabel} schools</h1>
      <p className="mt-1 text-body text-muted-ink">
        {total} school{total === 1 ? "" : "s"}
        {filtersActive ? " matching your filters" : ""}
      </p>

      <Form action={basePath} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Board</span>
          <select
            name="board"
            defaultValue={boardId ?? ""}
            className="h-11 min-w-36 rounded-md border border-line-blue bg-copy-white px-2.5 text-body"
          >
            <option value="">Any board</option>
            {filterOptions.boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name_en}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Grades</span>
          <select
            name="grade"
            defaultValue={maxClass ?? ""}
            className="h-11 min-w-36 rounded-md border border-line-blue bg-copy-white px-2.5 text-body"
          >
            <option value="">Any grades</option>
            {filterOptions.maxClasses.map((code) => (
              <option key={code} value={code}>
                {formatGradeRange(null, code)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex h-11 items-center gap-2">
          <input
            type="checkbox"
            name="admissions"
            value="open"
            defaultChecked={admissionsOpen}
            className="h-5 w-5 rounded-sm border-line-blue"
          />
          <span className="text-body">Admissions open now</span>
        </label>

        <button
          type="submit"
          className="flex h-11 items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
        >
          Apply filters
        </button>
        {filtersActive && (
          <Link href={basePath} className="flex h-11 items-center font-semibold text-ruled-blue">
            Clear filters
          </Link>
        )}
      </Form>

      <div className="mt-6">
        {schools.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => {
              const board = boardNames.get(school.id);
              const grades = formatGradeRange(school.min_class, school.max_class);
              const meta = board ? `${board} · ${grades}` : grades;

              const closesOn = admissionDeadlines.get(school.id);
              const deadline = { closesAt: closesOn ? new Date(closesOn) : null };
              const pill = deadlineToPill(deadlineState(deadline, now));

              return (
                <SchoolCard
                  key={school.id}
                  name={school.name_en}
                  meta={meta}
                  now={now}
                  deadline={deadline}
                  status={<StatusPill status={pill.status}>{pill.label}</StatusPill>}
                  fee="Not yet published"
                  freshness={<NotYetPublished />}
                  actions={false}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={
              filtersActive ? "No schools match these filters" : "No published schools here yet"
            }
            description={
              filtersActive
                ? "Try widening your filters, or browse every school in this district."
                : "Schools appear here once they're verified and published."
            }
            nextStepLabel="Clear filters"
            nextStepHref={basePath}
          />
        )}
      </div>

      {total > PAGE_SIZE && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-semibold text-ruled-blue">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-body text-muted-ink">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="font-semibold text-ruled-blue">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
