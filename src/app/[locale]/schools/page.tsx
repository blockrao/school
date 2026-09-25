import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { StatusPill } from "@/components/ui/badges";
import { CompareTray } from "@/components/ui/compare-tray";
import { RemovableFilterChip } from "@/components/ui/filter-chip";
import { NotYetPublished } from "@/components/ui/freshness-line";
import { SchoolCard } from "@/components/ui/school-card";
import { EmptyState } from "@/components/ui/state-message";
import {
  getAdmissionDeadlinesBySchoolId,
  getBoardNamesBySchoolId,
  getPublicDistrictBySlug,
  listDistrictFilterOptions,
  listPublicSchoolsByDistrict,
} from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { formatGradeRange } from "@/lib/grades";

// Launch district — see CLAUDE.md. Search is scoped here, not site-wide, until
// more districts are live.
const DISTRICT_SLUG = "jaipur";
const DISTRICT_LABEL = "Jaipur";
const PAGE_SIZE = 24;
const COMPARE_LIMIT = 4;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const q = first(searchParams.q) || undefined;
  const boardParam = first(searchParams.board);
  const boardId = boardParam ? Number(boardParam) : undefined;
  const maxClass = first(searchParams.grade) || undefined;
  const admissionsOpen = first(searchParams.admissions) === "open";
  const pageParam = first(searchParams.page);
  const page = pageParam ? Math.max(1, Number(pageParam) || 1) : 1;
  const compareIds = (first(searchParams.compare) || "").split(",").filter(Boolean);

  return { q, boardId, maxClass, admissionsOpen, page, compareIds };
}

export const metadata: Metadata = {
  title: `Schools in ${DISTRICT_LABEL} — SchoolOye`,
  description: `Search and filter schools in ${DISTRICT_LABEL}: board, grades and admission status.`,
  // Query-driven results are dynamic, near-duplicate content — the district page is
  // the indexable entry point into the same schools.
  robots: { index: false, follow: true },
};

export default async function SchoolsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/schools">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const now = new Date();

  const { q, boardId, maxClass, admissionsOpen, page, compareIds } = parseParams(rawSearchParams);
  const filtersActive = boardId !== undefined || maxClass !== undefined || admissionsOpen;

  const district = await getPublicDistrictBySlug(DISTRICT_SLUG);

  const [{ schools, total }, filterOptions] = district
    ? await Promise.all([
        listPublicSchoolsByDistrict(district.id, {
          query: q,
          boardId,
          maxClass,
          admissionsOpen,
          page,
          pageSize: PAGE_SIZE,
        }),
        listDistrictFilterOptions(district.id),
      ])
    : [
        { schools: [], total: 0 },
        { boards: [], maxClasses: [] },
      ];

  const schoolIds = schools.map((s) => s.id);
  const [boardNames, admissionDeadlines] = await Promise.all([
    getBoardNamesBySchoolId(schoolIds),
    getAdmissionDeadlinesBySchoolId(schoolIds),
  ]);

  const basePath = `/${locale}/schools`;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(
    overrides: Partial<{
      q: string;
      board: string;
      grade: string;
      admissions: string;
      compare: string;
      page: string;
    }>,
  ) {
    const merged = {
      q: q ?? "",
      board: boardId !== undefined ? String(boardId) : "",
      grade: maxClass ?? "",
      admissions: admissionsOpen ? "open" : "",
      compare: compareIds.join(","),
      page: "",
      ...overrides,
    };
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) qs.set(key, value);
    }
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  function compareToggleHref(schoolId: string): string | null {
    const inCompare = compareIds.includes(schoolId);
    if (!inCompare && compareIds.length >= COMPARE_LIMIT) return null;
    const next = inCompare ? compareIds.filter((id) => id !== schoolId) : [...compareIds, schoolId];
    return buildHref({ compare: next.join(",") });
  }

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 pb-24 md:px-10 md:py-9 md:pb-9">
      <h1 className="font-display text-title-m md:text-title-d">Schools in {DISTRICT_LABEL}</h1>

      <Form action={basePath} className="mt-4 flex flex-wrap items-end gap-3">
        {compareIds.length > 0 && (
          <input type="hidden" name="compare" value={compareIds.join(",")} />
        )}
        <label className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="School name"
            className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
        </label>

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
          Search
        </button>
      </Form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-body text-muted-ink">
          {total} school{total === 1 ? "" : "s"}
        </span>
        {q && <RemovableFilterChip href={buildHref({ q: "" })}>{`"${q}"`}</RemovableFilterChip>}
        {boardId !== undefined && (
          <RemovableFilterChip href={buildHref({ board: "" })}>
            {filterOptions.boards.find((b) => b.id === boardId)?.name_en ?? "Board"}
          </RemovableFilterChip>
        )}
        {maxClass && (
          <RemovableFilterChip href={buildHref({ grade: "" })}>
            {formatGradeRange(null, maxClass)}
          </RemovableFilterChip>
        )}
        {admissionsOpen && (
          <RemovableFilterChip href={buildHref({ admissions: "" })}>
            Admissions open
          </RemovableFilterChip>
        )}
        {filtersActive && (
          <Link
            href={buildHref({ q: "", board: "", grade: "", admissions: "" })}
            className="font-semibold text-ruled-blue"
          >
            Clear all
          </Link>
        )}
      </div>

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

              const inCompare = compareIds.includes(school.id);
              const toggleHref = compareToggleHref(school.id);

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
                  actions={
                    toggleHref ? (
                      <Link
                        href={toggleHref}
                        role="checkbox"
                        aria-checked={inCompare}
                        className={`col-span-2 flex h-11 items-center justify-center gap-2 rounded-md border font-semibold ${
                          inCompare
                            ? "border-ruled-blue bg-pill-results-bg text-ruled-blue"
                            : "border-line-blue text-ink"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-4.5 w-4.5 items-center justify-center rounded-xs border-2 border-ruled-blue text-copy-white ${
                            inCompare ? "bg-ruled-blue" : "bg-copy-white"
                          }`}
                        >
                          {inCompare && "✓"}
                        </span>
                        {inCompare ? "Remove from compare" : "Compare"}
                      </Link>
                    ) : (
                      <span className="col-span-2 flex h-11 items-center justify-center text-meta text-muted-ink">
                        Compare limit reached (4)
                      </span>
                    )
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={filtersActive || q ? "No schools match your search" : "No published schools yet"}
            description={
              filtersActive || q
                ? "Try a different search term, or clear your filters."
                : "Schools appear here once they're verified and published."
            }
            nextStepLabel="Clear search"
            nextStepHref={basePath}
          />
        )}
      </div>

      {total > PAGE_SIZE && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="font-semibold text-ruled-blue"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-body text-muted-ink">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref({ page: String(page + 1) })}
              className="font-semibold text-ruled-blue"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {compareIds.length >= 2 && (
        <div className="fixed inset-x-0 bottom-16 z-40 p-3 md:bottom-3 md:left-1/2 md:right-auto md:w-fit md:-translate-x-1/2">
          <CompareTray
            selectedCount={compareIds.length}
            totalCount={COMPARE_LIMIT}
            clearHref={buildHref({ compare: "" })}
            compareHref={`/${locale}/compare?ids=${compareIds.join(",")}`}
          />
        </div>
      )}
    </div>
  );
}
