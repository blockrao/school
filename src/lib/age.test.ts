import { describe, expect, it } from "vitest";
import { ageAtDate, nextAcademicYear, referenceDates } from "@/lib/age";

describe("ageAtDate", () => {
  it("computes full years and months", () => {
    expect(ageAtDate(new Date(2023, 7, 14), new Date(2027, 2, 31))).toEqual({
      years: 3,
      months: 7,
    });
  });

  it("handles the day-of-month boundary correctly", () => {
    // Born 10 Mar 2023, as of 31 Mar 2027 -> just past 4 years, 0 months (not 4y 0m rounding wrong)
    expect(ageAtDate(new Date(2023, 2, 10), new Date(2027, 2, 31))).toEqual({
      years: 4,
      months: 0,
    });
  });

  it("does not count a birthday that hasn't occurred yet this month as a full month", () => {
    // Born 20th, as-of the 10th of a later month -> one month short
    expect(ageAtDate(new Date(2023, 7, 20), new Date(2024, 8, 10))).toEqual({
      years: 1,
      months: 0,
    });
  });

  it("never returns negative years for a future date of birth", () => {
    expect(ageAtDate(new Date(2030, 0, 1), new Date(2027, 2, 31))).toEqual({
      years: 0,
      months: 0,
    });
  });
});

describe("nextAcademicYear", () => {
  it("returns the current year when today is before 1 April", () => {
    expect(nextAcademicYear(new Date(2026, 2, 15))).toBe(2026);
  });

  it("returns next year when today is on or after 1 April", () => {
    expect(nextAcademicYear(new Date(2026, 3, 1))).toBe(2027);
    expect(nextAcademicYear(new Date(2026, 8, 1))).toBe(2027);
  });
});

describe("referenceDates", () => {
  it("returns the three common cut-off dates for the given academic year", () => {
    const dates = referenceDates(2027);
    expect(dates.map((d) => d.label)).toEqual(["31 March", "30 June", "30 September"]);
    expect(dates[0].date).toEqual(new Date(2027, 2, 31));
    expect(dates[2].date).toEqual(new Date(2027, 8, 30));
  });
});
