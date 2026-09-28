import { describe, expect, it } from "vitest";
import type { PublicAdmissionUpdate } from "@/contracts";
import { describeAdmissionUpdateChanges } from "@/lib/admission-updates";

function update(overrides: Partial<PublicAdmissionUpdate>): PublicAdmissionUpdate {
  return {
    audit_id: 1,
    cycle_id: "cycle-1",
    school_id: "school-1",
    school_slug: "school-1",
    school_name: "Test School",
    academic_year: "2027-28",
    class_code: "c1",
    change_type: "updated",
    occurred_at: "2026-09-28T00:00:00Z",
    changed_fields: [],
    new_status: null,
    new_opens_on: null,
    new_closes_on: null,
    new_results_on: null,
    ...overrides,
  };
}

describe("describeAdmissionUpdateChanges", () => {
  it("names a status change", () => {
    expect(
      describeAdmissionUpdateChanges(update({ changed_fields: ["status"], new_status: "open" })),
    ).toBe("now open");
  });

  it("names a date-only change (the bug this fixes — used to say nothing)", () => {
    const result = describeAdmissionUpdateChanges(
      update({ changed_fields: ["closes_on"], new_closes_on: "2026-08-12" }),
    );
    expect(result).toContain("closes");
    expect(result).not.toBe("");
  });

  it("joins multiple changed fields in a fixed order", () => {
    const result = describeAdmissionUpdateChanges(
      update({
        changed_fields: ["status", "closes_on", "results_on"],
        new_status: "closed",
        new_closes_on: "2026-08-12",
        new_results_on: "2026-08-24",
      }),
    );
    expect(result).toBe("now closed · closes 12 Aug · results 24 Aug");
  });

  it("falls back to a plain statement rather than an empty string when a changed field has no new value", () => {
    expect(describeAdmissionUpdateChanges(update({ changed_fields: ["opens_on"] }))).toBe(
      "Details updated",
    );
  });
});
