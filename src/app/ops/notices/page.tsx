import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { extractProposedCycles, type ProposedCycle } from "@/lib/admission-notice-review";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { applyNoticeCycle, approveNotice, rejectNotice } from "./actions";

export const metadata: Metadata = {
  title: "Admission notices — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; published?: string }>;
}) {
  const { supabase } = await requireStaff();
  const { error: errorCode, published } = await searchParams;

  const [{ data: notices }, { data: classLevels }] = await Promise.all([
    supabase
      .from("admission_notices")
      .select("id, school_id, url, extraction, discovered_at")
      .eq("review", "pending")
      .order("discovered_at", { ascending: true }),
    supabase.from("class_levels").select("code, label_en").order("sort_order"),
  ]);

  const knownClassCodes = new Set((classLevels ?? []).map((c) => c.code));

  const schoolIds = [
    ...new Set((notices ?? []).map((n) => n.school_id).filter((id): id is string => !!id)),
  ];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Admission notices</h1>
      <p className="mt-1 text-body text-muted-ink">
        Notices discovered on schools' own sites or posted through the portal, awaiting review.
      </p>

      {published === "1" && (
        <p className="mt-3 rounded-md border border-board-green bg-pill-open-bg p-3 text-meta text-pill-open-fg">
          Published — the admission cycle now shows on the school's live page.
        </p>
      )}
      {errorCode === "missing_fields" && (
        <p className="mt-3 rounded-md border border-pill-soon-bd bg-pill-soon-bg p-3 text-meta text-pill-soon-fg">
          Pick a class and enter an academic year before publishing that cycle.
        </p>
      )}
      {errorCode === "publish_failed" && (
        <p className="mt-3 rounded-md border border-pill-soon-bd bg-pill-soon-bg p-3 text-meta text-pill-soon-fg">
          Couldn't save that cycle — nothing was published. Try again.
        </p>
      )}

      {!notices || notices.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing pending"
            description="No admission notices are currently awaiting review."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {notices.map((notice) => {
            const proposals = extractProposedCycles(notice.extraction, knownClassCodes);
            const hasPublishableProposal = proposals.length > 0 && notice.school_id;
            return (
              <div
                key={notice.id}
                id={`notice-${notice.id}`}
                className="rounded-md border border-rule bg-copy-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-display text-card font-semibold">
                      {notice.school_id
                        ? (schoolNameById.get(notice.school_id) ?? notice.school_id)
                        : "Unknown school"}
                    </span>
                    <p className="text-meta text-muted-ink">
                      <a
                        href={notice.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ruled-blue"
                      >
                        {notice.url}
                      </a>{" "}
                      · {new Date(notice.discovered_at).toLocaleString("en-IN")}
                    </p>
                    <pre className="mt-1 max-w-2xl whitespace-pre-wrap text-meta text-muted-ink">
                      {JSON.stringify(notice.extraction, null, 2)}
                    </pre>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!hasPublishableProposal && (
                      <form action={approveNotice}>
                        <input type="hidden" name="noticeId" value={notice.id} />
                        <button
                          type="submit"
                          className="flex h-10 items-center rounded-md border border-ink px-3 text-meta font-semibold"
                        >
                          Approve, nothing to publish
                        </button>
                      </form>
                    )}
                    <form action={rejectNotice}>
                      <input type="hidden" name="noticeId" value={notice.id} />
                      <button
                        type="submit"
                        className="flex h-10 items-center rounded-md border border-ink px-3 text-meta font-semibold"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>

                {hasPublishableProposal && (
                  <div className="mt-4 flex flex-col gap-3 border-rule border-t pt-4">
                    <p className="text-meta font-semibold text-muted-ink">
                      {proposals.length === 1
                        ? "Proposed admission cycle — confirm and publish"
                        : `${proposals.length} proposed admission cycles — confirm and publish each`}
                    </p>
                    {proposals.map((proposal, i) => (
                      <CycleProposalForm
                        // biome-ignore lint/suspicious/noArrayIndexKey: proposals are a fixed-length snapshot of one notice's extraction for this render, never reordered/filtered
                        key={i}
                        notice={{
                          id: notice.id,
                          schoolId: notice.school_id as string,
                          url: notice.url,
                        }}
                        proposal={proposal}
                        classLevels={classLevels ?? []}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CycleProposalForm({
  notice,
  proposal,
  classLevels,
}: {
  notice: { id: string; schoolId: string; url: string };
  proposal: ProposedCycle;
  classLevels: { code: string; label_en: string }[];
}) {
  return (
    <form
      action={applyNoticeCycle}
      className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border border-rule p-3 sm:grid-cols-4"
    >
      <input type="hidden" name="noticeId" value={notice.id} />
      <input type="hidden" name="schoolId" value={notice.schoolId} />
      <input type="hidden" name="noticeUrl" value={notice.url} />
      <input type="hidden" name="sourceType" value={proposal.sourceType} />
      <input
        type="hidden"
        name="classLabelAmbiguous"
        value={proposal.classCode ? (proposal.classLabelAmbiguous ? "1" : "0") : "1"}
      />
      {proposal.classLabelNote && (
        <input type="hidden" name="classLabelNote" value={proposal.classLabelNote} />
      )}

      <label className="col-span-2 flex flex-col gap-1 text-meta sm:col-span-1">
        Class{" "}
        {proposal.classLabelHint && !proposal.classCode && (
          <span className="font-normal text-slate">(said: "{proposal.classLabelHint}")</span>
        )}
        <select
          name="classCode"
          defaultValue={proposal.classCode ?? ""}
          required
          className="h-9 rounded-md border border-rule px-2"
        >
          <option value="" disabled>
            Choose a class…
          </option>
          {classLevels.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label_en}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Academic year
        <input
          type="text"
          name="academicYear"
          defaultValue={proposal.academicYear}
          placeholder="2027-28"
          required
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Opens
        <input
          type="date"
          name="opensOn"
          defaultValue={proposal.opensOn ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Closes
        <input
          type="date"
          name="closesOn"
          defaultValue={proposal.closesOn ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Results
        <input
          type="date"
          name="resultsOn"
          defaultValue={proposal.resultsOn ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Child DOB from
        <input
          type="date"
          name="dobFrom"
          defaultValue={proposal.dobFrom ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Child DOB to
        <input
          type="date"
          name="dobTo"
          defaultValue={proposal.dobTo ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Form mode
        <select
          name="formMode"
          defaultValue={proposal.formMode}
          className="h-9 rounded-md border border-rule px-2"
        >
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="both">Both</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Registration fee (₹)
        <input
          type="number"
          name="registrationFee"
          defaultValue={proposal.registrationFee ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-meta">
        Status
        <select
          name="statusOverride"
          defaultValue="auto"
          className="h-9 rounded-md border border-rule px-2"
        >
          <option value="auto">Auto, from dates</option>
          <option value="postponed">Postponed</option>
          <option value="cancelled">Cancelled</option>
          <option value="results_out">Results out</option>
        </select>
      </label>

      <label className="col-span-2 flex flex-col gap-1 text-meta sm:col-span-4">
        Form URL
        <input
          type="url"
          name="formUrl"
          defaultValue={proposal.formUrl ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1 text-meta sm:col-span-4">
        Documents required (comma-separated)
        <input
          type="text"
          name="documentsRequired"
          defaultValue={proposal.documentsRequired?.join(", ") ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1 text-meta sm:col-span-4">
        Selection notes
        <input
          type="text"
          name="selectionNotes"
          defaultValue={proposal.selectionNotes ?? ""}
          className="h-9 rounded-md border border-rule px-2"
        />
      </label>

      <button
        type="submit"
        className="col-span-2 mt-1 flex h-10 items-center justify-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white sm:col-span-4"
      >
        Publish this cycle
      </button>
    </form>
  );
}
