import type { Metadata } from "next";
import Link from "next/link";
import { TrackedApplyLink } from "@/components/admissions/tracked-apply-link";
import { StatusPill } from "@/components/ui/badges";
import { DeadlineMargin } from "@/components/ui/deadline-margin";
import { ProvenanceChip } from "@/components/ui/provenance-chip";
import { EmptyState } from "@/components/ui/state-message";
import { logAnalyticsEvent } from "@/lib/analytics";
import { listPublicAdmissionCycles } from "@/lib/db/public-adapter";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { formatCurrency } from "@/lib/format";
import { classifyAdmissionProvenance } from "@/lib/provenance";
import { localeCanonical } from "@/lib/seo";
import { admissionsRootPath, schoolPath } from "@/lib/urls";

// Reading searchParams already forces this route to render per-request, but
// that doesn't cache-bust the underlying Supabase fetch() calls on their
// own — without an explicit revalidate they're still served from Next's
// persistent Data Cache, so a freshly-added admission cycle could sit
// invisible here until the next deploy. Same reasoning/window as exams/page.tsx.
export const revalidate = 900;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** "c12" -> "12", anything else (nursery/lkg/ukg codes) shown as-is, capitalized. */
function classLabel(code: string): string {
  const match = /^c(\d+)$/.exec(code);
  if (match) return `Class ${match[1]}`;
  return code.charAt(0).toUpperCase() + code.slice(1);
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admissions">): Promise<Metadata> {
  const { locale } = await params;
  const canonical = localeCanonical(locale, admissionsRootPath("en"));
  const description =
    "Open and upcoming school admission cycles across SchoolOye — filter by city and class.";
  return {
    title: "School admissions — SchoolOye",
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: "School admissions — SchoolOye",
      description,
      url: canonical,
    },
  };
}

export default async function AdmissionsPage({ searchParams }: PageProps<"/[locale]/admissions">) {
  const rawSearchParams = await searchParams;
  const cityFilter = first(rawSearchParams.city) ?? "";
  const classFilter = first(rawSearchParams.class) ?? "";
  const statusFilter = first(rawSearchParams.status) ?? "";

  // Fetch once, unfiltered (P1.6: "do not build an elaborate search engine" —
  // the whole admission_cycles table is currently ~a dozen rows). City/class
  // options and the status pill are all derived in-memory from this single
  // list rather than separate queries or a new data model.
  const allCycles = await listPublicAdmissionCycles();

  await logAnalyticsEvent({ eventType: "page_view", entityType: "admissions_page" });

  const now = new Date();

  const cityOptions = [
    ...new Map(
      allCycles
        .filter((c) => c.city_slug && c.city_name)
        .map((c) => [c.city_slug as string, c.city_name as string]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const classOptions = [...new Set(allCycles.map((c) => c.class_code))].sort();

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "closing-soon", label: "Closing soon" },
    { value: "upcoming", label: "Upcoming" },
    { value: "closed", label: "Closed" },
  ];

  const cycles = allCycles.filter((c) => {
    if (cityFilter && c.city_slug !== cityFilter) return false;
    if (classFilter && c.class_code !== classFilter) return false;
    if (statusFilter) {
      const pill = deadlineToPill(
        deadlineState(
          {
            opensAt: c.opens_on ? new Date(c.opens_on) : null,
            closesAt: c.closes_on ? new Date(c.closes_on) : null,
          },
          now,
        ),
      );
      if (pill.status !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School admissions</h1>
      <p className="mt-1 text-body text-muted-ink">
        Open and upcoming admission cycles, in one place. Class/session dates as reported by each
        school.
      </p>

      <form method="get" className="mt-4 flex flex-wrap gap-3">
        <select
          name="city"
          defaultValue={cityFilter}
          className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
        >
          <option value="">All cities</option>
          {cityOptions.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
        <select
          name="class"
          defaultValue={classFilter}
          className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
        >
          <option value="">All classes</option>
          {classOptions.map((code) => (
            <option key={code} value={code}>
              {classLabel(code)}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
        >
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="flex h-11 items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
        >
          Filter
        </button>
        {(cityFilter || classFilter || statusFilter) && (
          <Link
            href={admissionsRootPath("en")}
            className="flex h-11 items-center text-meta font-semibold text-ruled-blue underline"
          >
            Clear filters
          </Link>
        )}
      </form>

      {cycles.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No matching admission cycles"
            description="Try a different city, class, or status."
            nextStepLabel="Clear filters"
            nextStepHref={admissionsRootPath("en")}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {cycles.map((cycle) => {
            const state = deadlineState(
              {
                opensAt: cycle.opens_on ? new Date(cycle.opens_on) : null,
                closesAt: cycle.closes_on ? new Date(cycle.closes_on) : null,
              },
              now,
            );
            const pill = deadlineToPill(state);
            const schoolName = cycle.name_en ?? "School";
            return (
              <div
                key={cycle.cycle_id}
                className="flex items-center gap-3 rounded-md border border-rule bg-copy-white p-4"
              >
                <DeadlineMargin
                  opensAt={cycle.opens_on ? new Date(cycle.opens_on) : null}
                  closesAt={cycle.closes_on ? new Date(cycle.closes_on) : null}
                  now={now}
                  className="h-24 w-32 shrink-0"
                />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={schoolPath("en", cycle.slug)}
                      className="font-display text-card font-semibold text-ink"
                    >
                      {schoolName}
                    </Link>
                    <StatusPill status={pill.status}>{pill.label}</StatusPill>
                  </div>
                  <span className="text-meta text-muted-ink">
                    {cycle.academic_year} · {classLabel(cycle.class_code)}
                    {cycle.city_name ? ` · ${cycle.city_name}` : ""}
                    {cycle.registration_fee != null
                      ? ` · ${formatCurrency(cycle.registration_fee)}`
                      : ""}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={`${schoolPath("en", cycle.slug)}#apply-heading`}
                      className="font-semibold text-ruled-blue text-meta"
                    >
                      Request admission information →
                    </Link>
                    {cycle.form_url && (
                      <TrackedApplyLink
                        href={cycle.form_url}
                        cycleId={cycle.cycle_id}
                        schoolId={cycle.school_id}
                        className="text-meta text-muted-ink underline"
                      >
                        Apply on school&rsquo;s official website ↗
                      </TrackedApplyLink>
                    )}
                  </div>
                  <ProvenanceChip
                    tier={classifyAdmissionProvenance(cycle.verification)}
                    checkedAt={cycle.last_checked_at}
                    className="mt-0.5"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
