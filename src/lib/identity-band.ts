export type IdentityBandState = "verified" | "school_claimed" | "unclaimed";

export type IdentityBand = {
  state: IdentityBandState;
  heading: string;
  description: string;
};

/**
 * Increment 5: the v2 design's three-state identity banner (design C1–C3),
 * built entirely from the two columns that already drive `recordBadge`
 * (`schools.claim`, `schools.verification`) — no new field, per the locked
 * scope. `claim_status` is a 4-value enum (unclaimed/pending/claimed/
 * rejected) at the type level, but `schools.claim` itself is only ever
 * written 'unclaimed' or 'claimed' by the claim pipeline (see
 * `for-schools/claim/[schoolId]/page.tsx`'s comment on why — 'pending' and
 * 'rejected' only ever live on `school_claims.status`, never on the school
 * row itself, confirmed against live data: every row in production is one
 * of these two values today). Anything that isn't exactly 'claimed' is
 * treated as unclaimed, matching `recordBadge`'s own defensive style.
 */
export function identityBand(claim: string, verification: string): IdentityBand {
  if (claim === "claimed" && verification === "school_verified") {
    return {
      state: "verified",
      heading: "Verified · school-managed",
      description:
        "Facts on this page are checked against the school's own documents. Verification is not a rating or recommendation.",
    };
  }
  if (claim === "claimed") {
    return {
      state: "school_claimed",
      heading: "School-claimed",
      description: "Managed by the school · verification in progress.",
    };
  }
  return {
    state: "unclaimed",
    heading: "Unclaimed",
    description: "Facts on this page are from public records SchoolOye has checked.",
  };
}
