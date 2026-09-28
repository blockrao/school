import { ClaimStatusLink } from "@/components/claim-status-link";
import { cn } from "@/lib/utils";

/**
 * Increment 10R — the design's C16 "Claim card" ("Right rail on desktop,
 * after Fees on mobile") for an unclaimed school. Flagged as entirely
 * missing by the Increment 10 audit — the only claim CTA that existed was
 * the small inline `<ClaimStatusLink>` text link in the header.
 *
 * This wraps that exact same, already-shipped `ClaimStatusLink` — same
 * claim/membership-aware states (member/pending/rejected/default), same
 * `/for-schools/claim/{schoolId}` flow — in a card so it reads as a real
 * standalone block rather than a header footnote. No new claim logic.
 *
 * Rendered twice by the page (see entity-page.tsx), once per responsive
 * position, each hidden at the other breakpoint via `className` — not
 * duplicated data-fetching: `ClaimStatusLink`'s own client-side
 * getSession()/membership check is cheap (no query at all for the common
 * signed-out visitor), and this is the smallest change that puts the same
 * widget in two different places in the DOM without restructuring the
 * page's grid into a single reorderable layout, which the fee/Fees-deferred,
 * no-redesign scope of this remediation pass doesn't call for.
 */
export function ClaimCard({
  schoolId,
  schoolName,
  className,
}: {
  schoolId: string;
  schoolName: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="claim-heading"
      className={cn(
        "flex flex-col gap-2 rounded-md border border-rule bg-copy-white p-4",
        className,
      )}
    >
      <h2 id="claim-heading" className="font-display text-card font-semibold">
        Is this your school?
      </h2>
      <p className="text-body text-muted-ink">
        Claim {schoolName} for free to correct facts, respond to families, and work toward a "School
        verified" record.
      </p>
      <ClaimStatusLink schoolId={schoolId} isClaimed={false} />
    </section>
  );
}
