import { istDateLabel } from "@/lib/ist-date";

export type RecordBadge = { label: string; official: boolean };

/**
 * Header record badge — D7 / D-052 (docs/guidelines/content-and-trust.md §3).
 * Exactly two states, matching the guideline's own wording: "Claimed +
 * school-verified pages" get "✓ Official record"; every other page —
 * unclaimed, pending, rejected, or claimed but not yet school-verified
 * (`verification` is `unverified` / `source_verified` / `ops_verified`) —
 * gets "Compiled by SchoolOye from public records". `claim` and
 * `verification` are independent columns (set together by the normal claim
 * flow, but not DB-constrained to move together — see `public.claim_status`
 * and `public.verification_status` in the baseline migration), so both are
 * checked rather than inferring one from the other. Never "Official" or a
 * logo outside the first state, and never a fabricated date.
 */
export function recordBadge(
  claim: string,
  verification: string,
  verifiedAt: Date | null,
): RecordBadge {
  const dateStr = verifiedAt ? istDateLabel(verifiedAt) : null;
  if (claim === "claimed" && verification === "school_verified") {
    return {
      label: `Official record${dateStr ? ` · verified by school on ${dateStr}` : ""}`,
      official: true,
    };
  }
  return {
    label: `Compiled by SchoolOye from public records${dateStr ? ` · ${dateStr}` : ""}`,
    official: false,
  };
}
