import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";
import { listStaff } from "@/lib/db/ops-dashboard";
import { listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import type { Database } from "@/lib/db/types";
import { assignTask, claimTask, createTask, updateTaskStatus } from "./actions";

type TaskStatus = Database["public"]["Enums"]["task_status"];

export const metadata: Metadata = {
  title: "Tasks — SchoolOye ops",
  robots: { index: false, follow: false },
};

const KIND_LABEL: Record<string, string> = {
  verify_notice: "Verify notice",
  verify_update: "Verify update",
  verify_record: "Verify record",
  call_school: "Call school",
  application: "Application",
  claim_review: "Claim review",
  correction_request: "Correction request",
  seat_update: "Seat update",
};

const STATUS_OPTIONS = ["open", "in_progress", "blocked", "done", "cancelled"] as const;
const KIND_OPTIONS = Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[];

type SearchParams = {
  status?: string;
  mine?: string;
};

/**
 * Cross-queue task/workflow view over the pre-existing `ops_tasks` table —
 * the "manage school ops" piece beyond the per-entity queues (schools,
 * claims, notices, ...): ad-hoc follow-ups (call a school, chase a document)
 * that don't belong to any single queue, plus a shared assignment layer over
 * all of them.
 */
export default async function OpsTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status: statusParam = "open", mine } = await searchParams;
  const status = statusParam as TaskStatus | "all";
  const supabase = await requireStaff();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("ops_tasks")
    .select(
      "id, kind, status, priority, school_id, ref_table, ref_id, assignee, due_at, payload, outcome, created_at",
    )
    .order("priority", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false });

  if (status !== "all") {
    query =
      status === "open" ? query.in("status", ["open", "in_progress"]) : query.eq("status", status);
  }
  if (mine === "1" && user) {
    query = query.eq("assignee", user.id);
  }

  const [{ data: tasks }, staff] = await Promise.all([query, listStaff()]);

  const schoolIds = [
    ...new Set((tasks ?? []).map((t) => t.school_id).filter((id): id is string => !!id)),
  ];
  const schools = schoolIds.length > 0 ? await listPublicSchoolsByIds(schoolIds) : [];
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "School"]));
  const staffById = new Map(staff.map((s) => [s.userId, s.fullName ?? s.email ?? s.userId]));

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Tasks</h1>
      <p className="mt-1 text-body text-muted-ink">
        Assignable follow-ups across every queue, plus ad-hoc work tied to a school.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-meta">
        {(["open", "all", "blocked", "done", "cancelled"] as const).map((s) => (
          <a
            key={s}
            href={`/ops/tasks?status=${s}${mine === "1" ? "&mine=1" : ""}`}
            className={`rounded-full border px-3 py-1 ${
              status === s ? "border-ruled-blue bg-ruled-blue text-copy-white" : "border-rule"
            }`}
          >
            {s === "open" ? "Open" : s[0].toUpperCase() + s.slice(1)}
          </a>
        ))}
        <a
          href={`/ops/tasks?status=${status}${mine === "1" ? "" : "&mine=1"}`}
          className={`rounded-full border px-3 py-1 ${
            mine === "1" ? "border-ruled-blue bg-ruled-blue text-copy-white" : "border-rule"
          }`}
        >
          Mine only
        </a>
      </div>

      <details className="mt-6 rounded-md border border-rule bg-copy-white p-4">
        <summary className="cursor-pointer font-display text-card font-semibold">New task</summary>
        <form action={createTask} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-meta">
            Kind
            <select name="kind" required className="h-10 rounded-md border border-rule px-2">
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-meta">
            School ID (optional)
            <input
              name="schoolId"
              placeholder="uuid — see /ops/schools"
              className="h-10 w-64 rounded-md border border-rule px-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-meta">
            Priority
            <input
              type="number"
              name="priority"
              defaultValue={3}
              min={1}
              max={5}
              className="h-10 w-20 rounded-md border border-rule px-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-meta">
            Due
            <input type="date" name="dueAt" className="h-10 rounded-md border border-rule px-2" />
          </label>
          <label className="flex flex-col gap-1 text-meta">
            Note
            <input name="note" className="h-10 w-64 rounded-md border border-rule px-2" />
          </label>
          <button
            type="submit"
            className="flex h-10 items-center rounded-md bg-ruled-blue px-4 text-meta font-semibold text-copy-white"
          >
            Create
          </button>
        </form>
      </details>

      {!tasks || tasks.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing here"
            description="No tasks match this filter."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-md border border-rule bg-copy-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-display text-card font-semibold">
                    {KIND_LABEL[task.kind] ?? task.kind}
                  </span>
                  <span className="ml-2 text-meta text-muted-ink">P{task.priority}</span>
                  {task.school_id ? (
                    <p className="text-meta text-muted-ink">
                      {schoolNameById.get(task.school_id) ?? task.school_id}
                    </p>
                  ) : null}
                  {task.payload && typeof task.payload === "object" && "note" in task.payload ? (
                    <p className="text-meta">{String((task.payload as { note?: string }).note)}</p>
                  ) : null}
                  <p className="text-meta text-muted-ink">
                    {task.assignee
                      ? `Assigned: ${staffById.get(task.assignee) ?? task.assignee}`
                      : "Unassigned"}
                    {task.due_at
                      ? ` · Due ${new Date(task.due_at).toLocaleDateString("en-IN")}`
                      : ""}
                    {" · "}
                    {new Date(task.created_at).toLocaleDateString("en-IN")}
                  </p>
                  {task.outcome ? (
                    <p className="mt-1 text-meta text-muted-ink">Outcome: {task.outcome}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full border border-rule px-2 py-0.5 text-meta">
                    {task.status.replace("_", " ")}
                  </span>
                  {!task.assignee || task.assignee !== user?.id ? (
                    <form action={claimTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-ink px-3 py-1.5 text-meta font-semibold"
                      >
                        Claim
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-rule pt-3">
                <form action={assignTask} className="flex items-end gap-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <label className="flex flex-col gap-1 text-meta">
                    Assignee
                    <select
                      name="assignee"
                      defaultValue={task.assignee ?? ""}
                      className="h-9 rounded-md border border-rule px-2"
                    >
                      <option value="">— none —</option>
                      {staff.map((s) => (
                        <option key={s.userId} value={s.userId}>
                          {s.fullName ?? s.email ?? s.userId}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="h-9 rounded-md border border-rule px-3 text-meta"
                  >
                    Reassign
                  </button>
                </form>

                <form action={updateTaskStatus} className="flex items-end gap-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <label className="flex flex-col gap-1 text-meta">
                    Status
                    <select
                      name="status"
                      defaultValue={task.status}
                      className="h-9 rounded-md border border-rule px-2"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-meta">
                    Outcome note
                    <input
                      name="outcome"
                      defaultValue={task.outcome ?? ""}
                      className="h-9 w-56 rounded-md border border-rule px-2"
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-9 rounded-md bg-ruled-blue px-3 text-meta font-semibold text-copy-white"
                  >
                    Update
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
