import { describe, expect, it } from "vitest";
import { cleanAddressPart, cleanStreet } from "./address-clean";

describe("cleanAddressPart", () => {
  it("drops NA-style placeholders", () => {
    for (const v of ["NA", "n/a", " - ", "None", "", null, undefined]) {
      expect(cleanAddressPart(v as string | null)).toBeNull();
    }
  });
  it("keeps real values", () => expect(cleanAddressPart("Sector 45")).toBe("Sector 45"));
});

describe("cleanStreet", () => {
  it("drops a street that repeats the school name", () => {
    expect(cleanStreet("G D PUBLIC SCHOOL GURUGRAM", "G D Public School", "Gurugram")).toBeNull();
    expect(cleanStreet("G D Public School", "G D Public School")).toBeNull();
  });
  it("keeps a real street", () => {
    expect(cleanStreet("Plot 4, Sector 45", "G D Public School", "Gurugram")).toBe(
      "Plot 4, Sector 45",
    );
  });
});
