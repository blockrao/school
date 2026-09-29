import { describe, expect, it } from "vitest";
import { admissionClassLabel, buildAdmissionsAnswer } from "@/lib/answer-sentence";

const now = new Date("2026-09-29T12:00:00.000Z");

describe("admissionClassLabel", () => {
  it("maps named early-years stages", () => {
    expect(admissionClassLabel("nursery")).toBe("Nursery");
    expect(admissionClassLabel("lkg")).toBe("LKG");
    expect(admissionClassLabel("ukg")).toBe("UKG");
    expect(admissionClassLabel("prep")).toBe("Prep");
  });

  it("maps c<N> codes", () => {
    expect(admissionClassLabel("c1")).toBe("Class 1");
    expect(admissionClassLabel("c12")).toBe("Class 12");
  });

  it("falls back to title-casing an unrecognized code rather than guessing", () => {
    expect(admissionClassLabel("montessori")).toBe("Montessori");
  });
});

describe("buildAdmissionsAnswer", () => {
  it("real case: Lancer's Convent's live open Nursery cycle", () => {
    const sentence = buildAdmissionsAnswer(
      "Lancer's Convent SR Sec School",
      {
        academic_year: "2027-28",
        class_code: "nursery",
        opens_on: "2026-09-25",
        closes_on: "2026-10-31",
      },
      now,
    );
    expect(sentence).toBe(
      "Lancer's Convent SR Sec School is accepting Nursery admissions for 2027-28, open until 31 Oct 2026.",
    );
  });

  it("no admission cycle at all", () => {
    expect(buildAdmissionsAnswer("Gyan Deep Sr.sec.", null, now)).toBe(
      "Admission dates for Gyan Deep Sr.sec. have not yet been published on SchoolOye.",
    );
  });

  it("a cycle exists but no dates were ever announced", () => {
    const sentence = buildAdmissionsAnswer(
      "New School",
      { academic_year: "2027-28", class_code: "c1", opens_on: null, closes_on: null },
      now,
    );
    expect(sentence).toBe(
      "Admission dates for Class 1 at New School (2027-28) have not yet been published.",
    );
  });

  it("a cycle that has already closed", () => {
    const sentence = buildAdmissionsAnswer(
      "DAV Public School",
      {
        academic_year: "2026-27",
        class_code: "c11",
        opens_on: "2026-01-01",
        closes_on: "2026-02-28",
      },
      now,
    );
    expect(sentence).toBe(
      "Admissions for Class 11 at DAV Public School (2026-27) closed on 28 Feb 2026.",
    );
  });

  it("a cycle that opens in the future", () => {
    const sentence = buildAdmissionsAnswer(
      "St. Xavier's",
      {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: "2026-12-01",
        closes_on: "2027-01-31",
      },
      now,
    );
    expect(sentence).toBe("Admissions for Class 1 at St. Xavier's (2027-28) open on 1 Dec 2026.");
  });

  it("open with no closing date announced", () => {
    const sentence = buildAdmissionsAnswer(
      "Open School",
      { academic_year: "2027-28", class_code: "c1", opens_on: "2026-09-01", closes_on: null },
      now,
    );
    expect(sentence).toBe(
      "Open School is accepting Class 1 admissions for 2027-28; no closing date has been announced yet.",
    );
  });

  it("never fabricates a specific day/month it doesn't have (not-announced names no date)", () => {
    const sentence = buildAdmissionsAnswer(
      "Test School",
      { academic_year: "2027-28", class_code: "c1", opens_on: null, closes_on: null },
      now,
    );
    // Academic year ("2027-28") is legitimately in the sentence; no month
    // abbreviation (which would only appear from a real opens_on/closes_on)
    // should ever show up here.
    expect(sentence).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });
});
