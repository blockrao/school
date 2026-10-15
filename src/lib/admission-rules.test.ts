import { describe, expect, it } from "vitest";
import { ageRuleText, seatsText, windowText } from "./admission-rules";

describe("admission rules text", () => {
  it("age range with reference date", () => {
    expect(ageRuleText(36, 48, "2027-03-31")).toBe("3 years to 4 years, as on 31 Mar 2027");
  });
  it("minimum only, with months", () => {
    expect(ageRuleText(66, null, null)).toBe("5 years 6 months minimum");
  });
  it("null when no rule", () => {
    expect(ageRuleText(null, null, "2027-03-31")).toBeNull();
  });
  it("seats", () => {
    expect(seatsText(120, 30)).toBe("120 seats, 30 under RTE");
    expect(seatsText(null, null)).toBeNull();
  });
  it("window", () => {
    expect(windowText("2026-10-01", "2026-11-30")).toBe("1 Oct 2026 to 30 Nov 2026");
    expect(windowText(null, "2026-11-30")).toBe("Closes 30 Nov 2026");
    expect(windowText(null, null)).toBeNull();
  });
});
