import { describe, expect, it } from "vitest";
import { deriveAdmissionStatus, extractProposedCycles } from "@/lib/admission-notice-review";

const CLASS_CODES = new Set(["nursery", "lkg", "ukg", "c1", "c9", "c12"]);

describe("extractProposedCycles", () => {
  it("returns [] for extraction with no cycles and no portal-form shape (contact-info-only pages)", () => {
    expect(extractProposedCycles({ email: ["a@b.com"], phone: [] }, CLASS_CODES)).toEqual([]);
    expect(extractProposedCycles(null, CLASS_CODES)).toEqual([]);
    expect(extractProposedCycles({ unreadable: true }, CLASS_CODES)).toEqual([]);
  });

  it("maps the crawler's cycles[] shape, carrying the notice-level academic_year onto every cycle", () => {
    const proposed = extractProposedCycles(
      {
        academic_year: "2024-25",
        cycles: [
          {
            class_code: "c9",
            opens_on: null,
            closes_on: null,
            results_on: "2024-02-26",
            form_mode: "online",
            registration_fee_inr: null,
            class_label_ambiguous: false,
          },
        ],
      },
      CLASS_CODES,
    );
    expect(proposed).toHaveLength(1);
    expect(proposed[0]).toMatchObject({
      classCode: "c9",
      academicYear: "2024-25",
      resultsOn: "2024-02-26",
      formMode: "online",
      sourceType: "official",
    });
  });

  it("never trusts a class_code the class_levels table doesn't recognize", () => {
    const [proposed] = extractProposedCycles(
      { academic_year: "2027-28", cycles: [{ class_code: "std-9-ish" }] },
      CLASS_CODES,
    );
    expect(proposed.classCode).toBeNull();
    expect(proposed.classLabelHint).toBe("std-9-ish");
  });

  it("maps the portal form's flat shape to one always-ambiguous proposal needing a class pick", () => {
    const proposed = extractProposedCycles(
      {
        session: "2027-28",
        classes: "Nursery, LKG, Class 1",
        form_type: "online",
        opens_on: "2027-01-10",
        closes_on: "2027-02-10",
        registration_fee: "500",
      },
      CLASS_CODES,
    );
    expect(proposed).toHaveLength(1);
    expect(proposed[0]).toMatchObject({
      classCode: null,
      classLabelNote: "Nursery, LKG, Class 1",
      classLabelAmbiguous: true,
      academicYear: "2027-28",
      registrationFee: 500,
      sourceType: "school_reported",
    });
  });
});

describe("deriveAdmissionStatus", () => {
  const now = new Date("2026-09-30T00:00:00+05:30");

  it("is not_announced with no dates at all", () => {
    expect(deriveAdmissionStatus(null, null, now)).toBe("not_announced");
  });

  it("is upcoming when opens_on is in the future", () => {
    expect(deriveAdmissionStatus("2026-10-15", null, now)).toBe("upcoming");
  });

  it("is closing_soon inside the 7-day window, closed after closes_on has passed", () => {
    expect(deriveAdmissionStatus(null, "2026-10-03", now)).toBe("closing_soon");
    expect(deriveAdmissionStatus(null, "2026-09-01", now)).toBe("closed");
  });

  it("is open when opened and either no closes_on or closes_on is well in the future", () => {
    expect(deriveAdmissionStatus("2026-09-01", null, now)).toBe("open");
    expect(deriveAdmissionStatus("2026-09-01", "2026-12-01", now)).toBe("open");
  });
});
