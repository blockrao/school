import Link from "next/link";
import type { CoverageTopic } from "@/lib/coverage";
import { cn } from "@/lib/utils";

/**
 * Increment 6 — purely presentational, same split as `DecisionStrip`: it
 * renders whatever `buildCoverage()` (src/lib/coverage.ts) hands it and has
 * no idea which table, or whether any table, backed a given topic.
 *
 * The claim CTA here is a plain link to the claim flow, not a second
 * `<ClaimStatusLink>` instance — that component's own doc comment notes it
 * assumes exactly one instance per page (one client-side session/membership
 * lookup); the header above already renders it. The existing claim page
 * (`/for-schools/claim/[schoolId]`) already redirects correctly for a
 * pending or rejected claimant server-side (Increment 4), so a plain link
 * is safe without duplicating that client-side check a second time on the
 * same page.
 *
 * Increment 10 — `variant="ledger"` adds the design's "coverage B" layout
 * (school-entity-page-v2 block 11) as a second, purely presentational
 * arrangement of the exact same `CoverageTopic[]` — one row per topic
 * instead of two pill buckets. This is NOT a new data source: the design's
 * ledger also shows a per-topic source label and a "record last checked"
 * date, but `CoverageTopic` only carries `status`, not a source or a
 * checked-date per topic (that data isn't tracked at this granularity
 * anywhere), so the ledger row shows status only — never a fabricated
 * source/date to fill the design's shape. Default stays `"buckets"`
 * (the original, unchanged rendering) so no existing call site's output
 * changes without opting in.
 */
export function CoverageCard({
  schoolName,
  topics,
  schoolId,
  isClaimed,
  variant = "buckets",
  className,
}: {
  schoolName: string;
  topics: CoverageTopic[];
  schoolId: string;
  isClaimed: boolean;
  variant?: "buckets" | "ledger";
  className?: string;
}) {
  const known = topics.filter((t) => t.status === "known");
  const beingVerified = topics.filter((t) => t.status === "being_verified");

  return (
    <section
      aria-labelledby="coverage-heading"
      className={cn("flex flex-col gap-4 rounded-md border border-rule p-4", className)}
    >
      <h2 id="coverage-heading" className="font-display text-card font-semibold">
        What SchoolOye knows
      </h2>

      {variant === "ledger" ? (
        <div className="flex flex-col">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-baseline justify-between gap-3 border-rule border-t py-2 text-body"
            >
              <span>{topic.label}</span>
              <span className={topic.status === "known" ? "font-medium text-ink" : "text-slate"}>
                {topic.status === "known" ? "Known" : "Not yet verified"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          {known.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {known.map((topic) => (
                <li
                  key={topic.id}
                  className="rounded-full border border-pill-open-bd bg-pill-open-bg px-3 py-1 text-meta font-medium text-pill-open-fg"
                >
                  {topic.label}
                </li>
              ))}
            </ul>
          )}

          {beingVerified.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-meta font-semibold text-muted-ink">Still being verified</h3>
              <ul className="flex flex-wrap gap-2">
                {beingVerified.map((topic) => (
                  <li
                    key={topic.id}
                    className="rounded-full border border-dashed border-sponsored-border px-3 py-1 text-meta text-slate"
                  >
                    {topic.label}
                  </li>
                ))}
              </ul>
              <p className="text-meta text-slate">
                Listed here means SchoolOye doesn't have this fact yet — not that the school hasn't
                verified it.
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-3 text-meta">
        {!isClaimed && (
          <Link href={`/for-schools/claim/${schoolId}`} className="font-semibold text-ruled-blue">
            Are you from this school? Claim it free
          </Link>
        )}
        <a
          href={`mailto:help@schooloye.in?subject=${encodeURIComponent(`Information about ${schoolName}`)}`}
          className="font-semibold text-ruled-blue"
        >
          Know something? Tell us — opens email
        </a>
      </div>
    </section>
  );
}
