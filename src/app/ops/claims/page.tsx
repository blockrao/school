import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { approveClaim, rejectClaim } from "./actions";

export const metadata: Metadata = {
  title: "Claims — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsClaimsPage() {
  const { supabase } = await requireStaff();

  const { data: claims } = await supabase
    .from("school_claims")
    .select("id, school_id, user_id, method, evidence, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const schoolIds = [...new Set((claims ?? []).map((c) => c.school_id))];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">School claims</h1>
      <p className="mt-1 text-body text-muted-ink">Pending claims awaiting review.</p>

      {!claims || claims.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing pending"
            description="No school claims are currently awaiting review."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {claims.map((claim) => {
            const evidence = claim.evidence as Record<string, unknown> | null;
            return (
              <div key={claim.id} className="rounded-md border border-rule bg-copy-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-display text-card font-semibold">
                      {schoolNameById.get(claim.school_id) ?? claim.school_id}
                    </span>
                    <p className="text-meta text-muted-ink">
                      {claim.method} · {new Date(claim.created_at).toLocaleString("en-IN")}
                    </p>
                    <pre className="mt-1 max-w-2xl whitespace-pre-wrap text-meta text-muted-ink">
                      {JSON.stringify(evidence, null, 2)}
                    </pre>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveClaim}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="schoolId" value={claim.school_id} />
                      <input type="hidden" name="userId" value={claim.user_id} />
                      <button
                        type="submit"
                        className="flex h-10 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectClaim}>
                      <input type="hidden" name="claimId" value={claim.id} />
                      <button
                        type="submit"
                        className="flex h-10 items-center rounded-md border border-ink px-3 text-meta font-semibold"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
