import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { confirmSeatStatus, rejectSeatStatus } from "./actions";

export const metadata: Metadata = {
  title: "Seat status — SchoolOye ops",
  robots: { index: false, follow: false },
};

export default async function OpsSeatsPage() {
  const supabase = await requireStaff();

  const { data: rows } = await supabase
    .from("seat_status")
    .select(
      "id, school_id, academic_year, class_code, public_status, range_label, reported_via, reported_at",
    )
    .is("confirmed_at", null)
    .order("reported_at", { ascending: true });

  const schoolIds = [...new Set((rows ?? []).map((r) => r.school_id))];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Seat status reports</h1>
      <p className="mt-1 text-body text-muted-ink">
        Self-reported by schools, not yet confirmed — won't show on OpenSeat until confirmed.
      </p>

      {!rows || rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing pending"
            description="No seat status reports are currently awaiting confirmation."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule p-3"
            >
              <div>
                <span className="font-semibold">
                  {schoolNameById.get(row.school_id) ?? row.school_id} · Class{" "}
                  {row.class_code.replace("c", "")}
                </span>
                <p className="text-meta text-muted-ink">
                  {row.academic_year} · {row.public_status}
                  {row.range_label ? ` (${row.range_label})` : ""} · reported{" "}
                  {new Date(row.reported_at).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={confirmSeatStatus}>
                  <input type="hidden" name="seatId" value={row.id} />
                  <button
                    type="submit"
                    className="flex h-10 items-center rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                  >
                    Confirm
                  </button>
                </form>
                <form action={rejectSeatStatus}>
                  <input type="hidden" name="seatId" value={row.id} />
                  <button
                    type="submit"
                    className="flex h-10 items-center rounded-md border border-ink px-3 text-meta font-semibold"
                  >
                    Reject
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
