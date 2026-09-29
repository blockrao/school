import type { PublicFieldEvidence } from "@/contracts";
import { cn } from "@/lib/utils";

/**
 * Identity & Search Presence Foundation v1, ID-04 (29 Sep 2026) — per-field
 * source attribution for School facts, fed by api.public_field_evidence
 * (licence_class='open' rows only).
 *
 * Deliberately NOT ProvenanceChip: that component's tiers ("School verified",
 * "SchoolOye checked", "Source record checked") all describe a verification
 * *event* — something was actively checked against a source. This data isn't
 * that: it's a bulk-import snapshot (UDISE+/state education department data)
 * with zero `verified_at` values across all 61,895 open rows (confirmed live,
 * 29 Sep 2026 — see db/views/106_public_field_evidence.sql). Labelling it
 * "checked" or reusing the "source_checked" tier copy would claim a
 * verification act that never happened — exactly what provenance.ts's header
 * comment already warns against for a different column. So this is a
 * separate, deliberately weaker claim: "here's where this came from and when
 * we recorded it," never "we checked this."
 */
export function SourceLine({
  evidence,
  className,
}: {
  evidence: PublicFieldEvidence;
  className?: string;
}) {
  const dateLabel = new Date(evidence.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <span className={cn("block text-meta text-so-ink3", className)}>
      {evidence.evidence_url ? (
        <a
          href={evidence.evidence_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="hover:text-ruled-blue"
        >
          Source: {evidence.source_name}
        </a>
      ) : (
        `Source: ${evidence.source_name}`
      )}
      {` · added ${dateLabel}`}
    </span>
  );
}
