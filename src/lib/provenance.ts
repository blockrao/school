/**
 * Increment 10 — the four-tier provenance distinction Prav required before
 * building any version of the design's ProvenanceChip: don't let a bare
 * `verified_at` timestamp masquerade as "this exact value was verified."
 *
 * Locked architectural rule (Prav, 28 Sep 2026, this increment): a chip's
 * label must map to a *real* trust source that already exists on the row —
 * never a manufactured claim. The live-data check that led here matters:
 * as of this increment, 10,657 of 10,668 schools are `unverified`/`unclaimed`
 * and zero are `school_verified` — so `unverified` (rendered as "Not
 * individually verified") is expected to be the common case, not a bug.
 *
 * Four tiers, ordered strongest to weakest:
 * - `school_verified` — the school itself claimed the page AND its
 *   verification reached `school_verified`. Both columns checked together
 *   (same pairing `recordBadge`/`identityBand` already require) — a claimed-
 *   but-not-yet-verified school does NOT get this tier.
 * - `ops_checked` — SchoolOye ops verified the fact (`verification =
 *   'ops_verified'`), independent of whether the school has claimed the page.
 * - `source_checked` — backed by a specific external record SchoolOye has
 *   checked against (`verification = 'source_verified'`) — e.g. a CBSE
 *   affiliation record or a government data source. Weaker than ops_checked:
 *   the source was checked, not independently verified by SchoolOye staff.
 * - `unverified` — no verification tier applies. This is the honest default,
 *   not an error state.
 *
 * Deliberately NOT wired to `field_provenance` in this increment: that
 * table's 85,068 rows all have `verified_at IS NULL` (a bulk UDISE+ import
 * snapshot, not a verification event — see the Increment 10 Step 3
 * correction pass) and roughly a quarter carry `licence_class = 'internal'`
 * (not public-safe as-is). Building a `source_checked` tier off it would
 * require a new public view filtering to `licence_class = 'open'` — exactly
 * the kind of access-control change this increment stops for rather than
 * improvises. `source_checked` here is driven only by the `verification`
 * enum columns already exposed on `schools` and `admission_cycles`.
 */

export type ProvenanceTier = "school_verified" | "ops_checked" | "source_checked" | "unverified";

export function classifySchoolProvenance(claim: string, verification: string): ProvenanceTier {
  if (claim === "claimed" && verification === "school_verified") return "school_verified";
  if (verification === "ops_verified") return "ops_checked";
  if (verification === "source_verified") return "source_checked";
  return "unverified";
}

/**
 * `admission_cycles.verification` carries the same three-value enum
 * (`unverified`/`source_verified`/`ops_verified`) but has no claim column of
 * its own to pair with `school_verified` — an admission cycle is verified by
 * ops or sourced, never "school-verified" as a distinct tier, so this never
 * returns `school_verified`.
 */
export function classifyAdmissionProvenance(verification: string): ProvenanceTier {
  if (verification === "ops_verified") return "ops_checked";
  if (verification === "source_verified") return "source_checked";
  return "unverified";
}
