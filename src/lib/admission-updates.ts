import type { PublicAdmissionUpdate } from "@/contracts";

/**
 * Increment 10R — the "Recent admission updates" row used to only ever say
 * *that* something changed ("Admission updated"), naming the new status when
 * status was the field that changed but staying silent about everything
 * else — so a cycle whose only change was a date shift rendered a
 * content-free line. This names every allowlisted field
 * `api.public_admission_updates` (db/views/096_public_admission_updates.sql)
 * says actually changed, in a fixed, readable order. Pure/testable, same
 * style as eligibility.ts/provenance.ts.
 */
export function describeAdmissionUpdateChanges(update: PublicAdmissionUpdate): string {
  const parts: string[] = [];

  if (update.changed_fields.includes("status") && update.new_status) {
    parts.push(`now ${update.new_status.replace(/_/g, " ")}`);
  }
  if (update.changed_fields.includes("opens_on") && update.new_opens_on) {
    parts.push(`opens ${formatShortDate(update.new_opens_on)}`);
  }
  if (update.changed_fields.includes("closes_on") && update.new_closes_on) {
    parts.push(`closes ${formatShortDate(update.new_closes_on)}`);
  }
  if (update.changed_fields.includes("results_on") && update.new_results_on) {
    parts.push(`results ${formatShortDate(update.new_results_on)}`);
  }

  // Every row from the view has at least one changed, allowlisted field by
  // construction (array_length(...) > 0 in the view itself) — but a field
  // can be in `changed_fields` with a null new value (e.g. a date cleared
  // back to unknown), which the checks above correctly skip. Rather than
  // render nothing in that edge case, say plainly that something changed.
  return parts.length > 0 ? parts.join(" · ") : "Details updated";
}

function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
