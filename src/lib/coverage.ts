import type { DecisionSlot } from "@/lib/decision-strip";

/**
 * Increment 6 — the v2 design's coverage card (C7-C9), tightened per Prav's
 * review: no numerical completeness score, two plain buckets instead
 * ("What SchoolOye knows" / "Still being verified"), and "known" is never
 * conflated with "verified" — a topic here means SchoolOye has a usable
 * fact to show, not that the school (or SchoolOye) has verified it. Only
 * `recordBadge`'s "Official record" state carries that stronger claim.
 *
 * Locked architectural rule: this is a *projection* of facts the page
 * already establishes, not a second completeness engine. Five of the ten
 * topics below (admissions, classes offered, location, annual fee, board
 * results) are read directly off the same `DecisionSlot[]` Increment 5
 * already computes for the decision strip on the same render — never
 * re-derived independently. The remaining topics (identity, board &
 * affiliation, contact information, staff, facilities & safety) have no
 * decision-strip slot to read, so they use the exact same conditions
 * `entity-page.tsx` already uses to decide whether to show a value or a
 * `NotYetPublished` fallback in those sections.
 *
 * `facilities_safety` has no dynamic input at all: `school_facilities`
 * has zero rows in production and no `api.*` view (same architectural gap
 * found for `fee_items`/`school_media` in Increment 5) — always
 * "being verified" until that data-enablement work happens, same
 * reasoning as `unsupportedSlot` in decision-strip.ts.
 */

export type CoverageStatus = "known" | "being_verified";

export type CoverageTopic = {
  id: string;
  label: string;
  status: CoverageStatus;
};

export type CoveragePageFacts = {
  hasIdentity: boolean;
  hasBoardAffiliation: boolean;
  hasContact: boolean;
  hasStaff: boolean;
};

function fromSlot(slots: DecisionSlot[], slotId: string): CoverageStatus {
  const slot = slots.find((s) => s.id === slotId);
  return slot?.status === "available" ? "known" : "being_verified";
}

function fromFact(has: boolean): CoverageStatus {
  return has ? "known" : "being_verified";
}

export function buildCoverage(
  decisionSlots: DecisionSlot[],
  pageFacts: CoveragePageFacts,
): CoverageTopic[] {
  return [
    { id: "identity", label: "School identity", status: fromFact(pageFacts.hasIdentity) },
    {
      id: "board_affiliation",
      label: "Board & affiliation",
      status: fromFact(pageFacts.hasBoardAffiliation),
    },
    {
      id: "classes_offered",
      label: "Classes offered",
      status: fromSlot(decisionSlots, "entry_classes"),
    },
    { id: "location", label: "Location", status: fromSlot(decisionSlots, "location") },
    { id: "contact", label: "Contact information", status: fromFact(pageFacts.hasContact) },
    { id: "staff", label: "Staff", status: fromFact(pageFacts.hasStaff) },
    { id: "admissions", label: "Admissions", status: fromSlot(decisionSlots, "admissions") },
    { id: "annual_fee", label: "Annual fee", status: fromSlot(decisionSlots, "annual_fee") },
    {
      id: "board_results",
      label: "Board results",
      status: fromSlot(decisionSlots, "board_result"),
    },
    { id: "facilities_safety", label: "Facilities & safety", status: "being_verified" },
  ];
}
