import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";

export const metadata: Metadata = {
  title: "Schools — SchoolOye ops",
  robots: { index: false, follow: false },
};

const STATUS_OPTIONS = ["draft", "published", "hidden", "closed", "opt_out"] as const;
const VERIFICATION_OPTIONS = [
  "unverified",
  "source_verified",
  "ops_verified",
  "school_verified",
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  hidden: "Hidden",
  closed: "Closed",
  opt_out: "Opted out",
};

const VERIFICATION_LABEL: Record<string, string> = {
  unverified: "Unverified",
  source_verified: "Source verified",
  ops_verified: "Ops verified",
  school_verified: "School verified",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "border-sponsored-border text-muted-ink",
  published: "border-pill-open-bd bg-pill-open-bg text-pill-open-fg",
  hidden: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
  closed: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
  opt_out: "border-pill-closed-bd bg-pill-closed-bg text-muted-ink",
};

type SearchParams = {
  q?: string;
  status?: string;
  verification?: string;
};

/**
 * The general school-detail verification/publish queue (docs/screen-map.md's
 * "Ops Verification Queue", Flow 6.15) — search any school, open its full raw
 * record (not the redacted public view), and set status/verification after an
 * agent has actually confirmed the facts, per phone or a live source.
 *
 * Defaults to status=draft since that's the entire catalog today (see
 * db/views/010_public_schools.sql's header note) — everything starts here
 * until someone deliberately publishes it.
 */
export default async function OpsSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "draft";
  const verification = params.verification ?? "";

  let query = supabase
    .from("schools")
    .select(
      "id, name_en, slug, school_code, address, pincode, tier, status, verification, claim, completeness, last_verified_at",
    )
    .order("name_en", { ascending: true })
    .limit(100);

  if (q) query = query.ilike("name_en", `%${q}%`);
  if (status) query = query.eq("status", status as (typeof STATUS_OPTIONS)[number]);
  if (verification)
    query = query.eq("verification", verification as (typeof VERIFICATION_OPTIONS)[number]);

  const { data: schools, error } = await query;

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Schools</h1>
      <p className="mt-1 text-body text-muted-ink">
        Search any school, open its full record, verify the facts, and publish.
      </p>
      {/* Plain <a>: a file download, not a client-side navigation. */}
      <a
        href="/ops/export/schools"
        className="mt-2 inline-flex min-h-10 items-center text-body font-semibold text-ruled-blue"
      >
        Download all school URLs (CSV)
      </a>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/ops/schools">
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Name</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            className="h-10 w-64 rounded-md border border-line-blue-strong bg-copy-white px-2 text-meta outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="h-10 w-40 rounded-md border border-line-blue-strong bg-copy-white px-2 text-meta outline-none"
          >
            <option value="">Any</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Verification</span>
          <select
            name="verification"
            defaultValue={verification}
            className="h-10 w-44 rounded-md border border-line-blue-strong bg-copy-white px-2 text-meta outline-none"
          >
            <option value="">Any</option>
            {VERIFICATION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {VERIFICATION_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="flex h-10 items-center rounded-md bg-ruled-blue px-4 text-meta font-semibold text-copy-white"
        >
          Filter
        </button>
      </form>

      {error ? (
        <p className="mt-6 text-meta text-error">Couldn't load schools: {error.message}</p>
      ) : !schools || schools.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No matches"
            description="Nothing matches this search and filter combination."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-meta text-muted-ink">
            {schools.length} school{schools.length === 1 ? "" : "s"}
            {schools.length === 100 ? " (showing first 100 — narrow your search)" : ""}
          </p>
          {schools.map((school) => (
            <Link
              key={school.id}
              href={`/ops/schools/${school.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
            >
              <div className="min-w-0 flex-1">
                <span className="font-display text-card font-semibold">
                  {school.name_en ?? "Name not yet published"}
                </span>
                <p className="text-meta text-muted-ink">
                  {school.address ?? "No address on file"}
                  {school.pincode ? ` · ${school.pincode}` : ""} · Tier {school.tier} · Code{" "}
                  {school.school_code}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span
                  className={`inline-flex h-fit items-center rounded-full border px-2.5 py-px text-meta font-semibold ${STATUS_CLASS[school.status] ?? ""}`}
                >
                  {STATUS_LABEL[school.status] ?? school.status}
                </span>
                <span className="inline-flex h-fit items-center rounded-sm border border-sponsored-border px-2 py-0.5 text-meta text-muted-ink">
                  {VERIFICATION_LABEL[school.verification] ?? school.verification}
                </span>
                <span className="text-meta text-muted-ink">{school.completeness}% complete</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
