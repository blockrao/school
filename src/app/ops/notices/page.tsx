import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { approveNotice, rejectNotice } from "./actions";

export const metadata: Metadata = {
  title: "Admission notices — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsNoticesPage() {
  const supabase = await requireStaff();

  const { data: notices } = await supabase
    .from("admission_notices")
    .select("id, school_id, url, extraction, discovered_at")
    .eq("review", "pending")
    .order("discovered_at", { ascending: true });

  const schoolIds = [
    ...new Set((notices ?? []).map((n) => n.school_id).filter((id): id is string => !!id)),
  ];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Admission notices</h1>
      <p className="mt-1 text-body text-muted-ink">
        Notices submitted by schools, awaiting review.
      </p>

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
          {notices.map((notice) => (
            <div key={notice.id} className="rounded-md border border-rule bg-copy-white p-4">
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
                  <form action={approveNotice}>
                    <input type="hidden" name="noticeId" value={notice.id} />
                    <button
                      type="submit"
                      className="flex h-10 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                    >
                      Approve
                    </button>
                  </form>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
