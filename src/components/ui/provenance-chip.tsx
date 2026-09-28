import type { ProvenanceTier } from "@/lib/provenance";
import { cn } from "@/lib/utils";

/**
 * Increment 10 — v1 of the design's ProvenanceChip (school-entity-page-v2
 * block 20), restricted to the four real tiers `src/lib/provenance.ts`
 * classifies. This is intentionally a plain label, not the design's full
 * collapsed/expand-with-change-history widget: `field_provenance` (the only
 * table with real per-field change history) is a bulk-import table with no
 * public read path and no `verified_at` values (see provenance.ts's header
 * comment) — building the expandable history panel would mean exposing that
 * table before its access-control question is answered, which this
 * increment stops for rather than does. A future increment can upgrade this
 * component into the fuller widget once that view exists; every call site
 * only needs to change its data, not this component's contract.
 */

const COPY: Record<ProvenanceTier, { label: string; tone: "strong" | "neutral" | "muted" }> = {
  school_verified: { label: "School verified", tone: "strong" },
  ops_checked: { label: "SchoolOye checked", tone: "strong" },
  source_checked: { label: "Source record checked", tone: "neutral" },
  unverified: { label: "Not individually verified", tone: "muted" },
};

const TONE_CLASS: Record<"strong" | "neutral" | "muted", string> = {
  strong: "text-so-accent",
  neutral: "text-so-ink2",
  muted: "text-so-ink3",
};

export function ProvenanceChip({
  tier,
  checkedAt,
  className,
}: {
  tier: ProvenanceTier;
  /** ISO date string or null — rendered only for the two "checked" tiers; never shown for `source_checked`/`unverified`, since a bare date there would imply a check that didn't happen. */
  checkedAt?: string | null;
  className?: string;
}) {
  const copy = COPY[tier];
  const showDate = checkedAt && (tier === "school_verified" || tier === "ops_checked");
  const dateLabel = showDate
    ? new Date(checkedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-meta font-medium",
        TONE_CLASS[copy.tone],
        className,
      )}
    >
      {copy.tone !== "muted" && (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
          style={{
            strokeWidth: 1.4,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            flexShrink: 0,
          }}
        >
          <path d="M4 1.5h5.5l3 3V14.5H4z M9.5 1.5v3h3 M6.2 9.4l1.5 1.5 2.7-3" />
        </svg>
      )}
      {copy.label}
      {dateLabel ? ` · ${dateLabel}` : ""}
    </span>
  );
}
