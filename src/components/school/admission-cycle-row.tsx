import { TrackedApplyLink } from "@/components/admissions/tracked-apply-link";
import { StatusPill } from "@/components/ui/badges";
import { ProvenanceChip } from "@/components/ui/provenance-chip";
import type { PublicSchoolAdmission } from "@/contracts";
import {
  ageRuleText,
  classLabel,
  SELECTION_METHOD_LABEL,
  seatsText,
  windowText,
} from "@/lib/admission-rules";
import { deadlineState, deadlineToPill } from "@/lib/deadline";
import { factLabel } from "@/lib/fact-label";
import { classifyAdmissionProvenance } from "@/lib/provenance";

/** One admissions row per entry class: status, window, rules, and who said so. */
export function AdmissionCycleRow({
  cycle,
  schoolId,
  now,
}: {
  cycle: PublicSchoolAdmission;
  schoolId: string;
  now: Date;
}) {
  const state = deadlineState(
    {
      opensAt: cycle.opens_on ? new Date(cycle.opens_on) : null,
      closesAt: cycle.closes_on ? new Date(cycle.closes_on) : null,
    },
    now,
  );
  const pill = deadlineToPill(state);
  const facts: Array<[string, string]> = [];
  const window = windowText(cycle.opens_on, cycle.closes_on);
  if (window) facts.push(["Window", window]);
  const age = ageRuleText(cycle.min_age_months, cycle.max_age_months, cycle.age_reference_date);
  if (age) facts.push(["Age", age]);
  const seats = seatsText(cycle.seats_total, cycle.seats_rte);
  if (seats) facts.push(["Seats", seats]);
  if (cycle.selection_method) {
    facts.push([
      "Selection",
      SELECTION_METHOD_LABEL[cycle.selection_method] ?? cycle.selection_method,
    ]);
  }
  facts.push([
    "Form",
    cycle.form_mode === "online"
      ? "Online"
      : cycle.form_mode === "offline"
        ? "Offline"
        : cycle.form_mode === "both"
          ? "Online or offline"
          : "Not reported",
  ]);
  if (cycle.documents_required.length > 0) {
    facts.push(["Documents", cycle.documents_required.join(", ")]);
  }
  const label = factLabel(
    cycle.source_kind ?? "compiled",
    Boolean(cycle.evidence_url),
    cycle.observed_at ?? cycle.last_checked_at,
  );

  return (
    <div className="flex flex-col gap-2 rounded-md border border-rule p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-card font-semibold">
          {classLabel(cycle.class_code)}
          <span className="ml-2 text-meta font-normal text-muted-ink">{cycle.academic_year}</span>
        </span>
        <StatusPill status={pill.status}>{pill.label}</StatusPill>
      </div>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-body">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-meta text-muted-ink">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a href="#apply-heading" className="font-semibold text-ruled-blue text-meta">
          Request admission information →
        </a>
        {cycle.form_url && (
          <TrackedApplyLink
            href={cycle.form_url}
            cycleId={cycle.cycle_id}
            schoolId={schoolId}
            className="text-meta text-muted-ink underline"
          >
            Apply on school&rsquo;s official website ↗
          </TrackedApplyLink>
        )}
        {cycle.prospectus_url && (
          <a
            href={cycle.prospectus_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-meta text-muted-ink underline"
          >
            Prospectus ↗
          </a>
        )}
      </div>
      <p className="text-meta text-muted-ink">{label.text}</p>
      <ProvenanceChip
        tier={classifyAdmissionProvenance(cycle.verification)}
        checkedAt={cycle.last_checked_at}
      />
    </div>
  );
}
