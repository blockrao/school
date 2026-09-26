import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/state-message";
import { requireStaff } from "@/lib/db/ops";

export const metadata: Metadata = {
  title: "Audit log — SchoolOye ops",
  robots: { index: false, follow: false },
};

const TABLE_OPTIONS = ["profiles", "school_members", "schools", "school_claims"] as const;

type SearchParams = { table?: string };

/** Read-only view over audit_log — every insert/update/delete on a privilege-bearing table. */
export default async function OpsAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { table } = await searchParams;
  const { supabase } = await requireStaff();

  let query = supabase
    .from("audit_log")
    .select("id, actor, actor_role, action, entity_table, entity_id, before, after, at")
    .order("at", { ascending: false })
    .limit(100);

  if (table) query = query.eq("entity_table", table);

  const { data: entries } = await query;

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-6 md:px-10 md:py-9">
      <h1 className="font-display text-title-m md:text-title-d">Audit log</h1>
      <p className="mt-1 text-body text-muted-ink">Last 100 changes, most recent first.</p>

      <div className="mt-4 flex flex-wrap gap-2 text-meta">
        <a
          href="/ops/audit"
          className={`rounded-full border px-3 py-1 ${!table ? "border-ruled-blue bg-ruled-blue text-copy-white" : "border-rule"}`}
        >
          All tables
        </a>
        {TABLE_OPTIONS.map((t) => (
          <a
            key={t}
            href={`/ops/audit?table=${t}`}
            className={`rounded-full border px-3 py-1 ${table === t ? "border-ruled-blue bg-ruled-blue text-copy-white" : "border-rule"}`}
          >
            {t}
          </a>
        ))}
      </div>

      {!entries || entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing logged"
            description="No audit entries match this filter."
            nextStepLabel="Back to ops"
            nextStepHref="/ops"
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {entries.map((entry) => (
            <details key={entry.id} className="rounded-md border border-rule bg-copy-white p-3">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-semibold">{entry.action}</span>
                  <span className="ml-2 text-meta text-muted-ink">
                    {entry.entity_table}
                    {entry.entity_id ? ` · ${entry.entity_id}` : ""}
                  </span>
                </span>
                <span className="text-meta text-muted-ink">
                  {entry.actor_role ? `${entry.actor_role} · ` : ""}
                  {new Date(entry.at).toLocaleString("en-IN")}
                </span>
              </summary>
              <div className="mt-2 grid gap-2 text-meta md:grid-cols-2">
                {entry.before ? (
                  <div>
                    <p className="font-semibold text-muted-ink">Before</p>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(entry.before, null, 2)}
                    </pre>
                  </div>
                ) : null}
                {entry.after ? (
                  <div>
                    <p className="font-semibold text-muted-ink">After</p>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(entry.after, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
