import { describe, expect, it } from "vitest";
import { buildSchoolMetaDescription, schoolPageTitle } from "@/lib/school-metadata";

describe("buildSchoolMetaDescription", () => {
  it("never claims fees or a specific admission date — no data pipeline exists for either", () => {
    const description = buildSchoolMetaDescription({
      name: "Gyan Deep Sr.sec.",
      areaLabel: "Gurugram",
      boardName: null,
      grades: "Class 1–12",
    });
    expect(description).not.toContain("fee");
    expect(description).not.toContain("admission date");
    expect(description).toBe(
      "Gyan Deep Sr.sec. in Gurugram: Class 1–12 — admissions, facts and contact details.",
    );
  });

  it("includes the board only when actually known", () => {
    const description = buildSchoolMetaDescription({
      name: "DAV Public School",
      areaLabel: "Gurugram",
      boardName: "CBSE",
      grades: "Class 1–12",
    });
    expect(description).toBe(
      "DAV Public School in Gurugram: CBSE affiliated, Class 1–12 — admissions, facts and contact details.",
    );
  });

  it("omits grades when not yet published, without a dangling separator", () => {
    const description = buildSchoolMetaDescription({
      name: "New School",
      areaLabel: "Jaipur",
      boardName: null,
      grades: "Not yet published",
    });
    expect(description).toBe("New School in Jaipur: admissions, facts and contact details.");
  });

  it("joins board and grades before the fixed sections phrase", () => {
    const description = buildSchoolMetaDescription({
      name: "St. Xavier's",
      areaLabel: "Jaipur",
      boardName: "ICSE",
      grades: "Up to Class 8",
    });
    expect(description).toBe(
      "St. Xavier's in Jaipur: ICSE affiliated, Up to Class 8 — admissions, facts and contact details.",
    );
  });
});

describe("schoolPageTitle", () => {
  it("never claims a specific admission session or fees — no data pipeline exists for either", () => {
    const title = schoolPageTitle("Gyan Deep Sr.sec.", "Gurugram");
    expect(title).not.toMatch(/admission \d/i);
    expect(title).not.toContain("Fee");
    expect(title).toBe("Gyan Deep Sr.sec., Gurugram: Admissions, Facts & Contact · SchoolOye");
  });

  it("uses the same middot separator as every other title pattern (seo-geo.md §3)", () => {
    expect(schoolPageTitle("St. Xavier's", "Jaipur")).toContain(" · SchoolOye");
  });
});
