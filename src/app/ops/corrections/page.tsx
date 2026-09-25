import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { resolveCorrection } from "./actions";

// Review + resolve only — applying the actual field change happens outside this
// screen (no general school-field editor exists yet in this repo). Marking
// resolved records that the requested change was made some other way.

export const metadata: Metadata = {
  title: "Corrections — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsCorrectionsPage() {
  const supabase = await requireStaff();

  const { data: requests } = await supabase
    .from("correction_requests")
    .select("id, school_id, kind, details, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const schoolIds = [
    ...new Set((requests ?? []).map((r) => r.school_id).filter((id): id is string => !!id)),
  ];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Correction requests</h1>
      <p className="mt-1 text-body text-muted-ink">
        Open requests. Apply the change directly, then mark resolved.
      </p>

      {!requests || requests.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing open"
            description="No correction requests are currently open."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-md border border-rule bg-copy-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-display text-card font-semibold">
                    {req.school_id
                      ? (schoolNameById.get(req.school_id) ?? req.school_id)
                      : "Unknown school"}
                  </span>
                  <p className="text-meta text-muted-ink">
                    {req.kind} · {new Date(req.created_at).toLocaleString("en-IN")}
                  </p>
                  <pre className="mt-1 max-w-2xl whitespace-pre-wrap text-meta text-muted-ink">
                    {req.details}
                  </pre>
                </div>
                <form action={resolveCorrection}>
                  <input type="hidden" name="requestId" value={req.id} />
                  <button
                    type="submit"
                    className="flex h-10 shrink-0 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                  >
                    Mark resolved
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
