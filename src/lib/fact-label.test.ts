import { describe, expect, it } from "vitest";
import { factLabel, formatFactDate } from "./fact-label";

describe("formatFactDate", () => {
  it("formats an ISO date", () => expect(formatFactDate("2026-10-12")).toBe("12 Oct 2026"));
  it("returns null for junk or empty", () => {
    expect(formatFactDate("nope")).toBeNull();
    expect(formatFactDate(null)).toBeNull();
  });
});

describe("factLabel", () => {
  it("says school-provided with a document", () => {
    const l = factLabel("school_admin", true, "2026-04-01");
    expect(l.text).toBe("Provided by the school, with a document, 1 Apr 2026");
    expect(l.tone).toBe("school");
  });
  it("never claims verification for compiled facts", () => {
    const l = factLabel("compiled", false, null);
    expect(l.text).toBe("Compiled by SchoolOye, not verified");
    expect(l.tone).toBe("compiled");
  });
  it("labels public records", () => {
    expect(factLabel("public_record", false, "2026-10-09").tone).toBe("record");
  });
  it("treats unknown kinds as compiled", () => {
    expect(factLabel("whatever", false, null).tone).toBe("compiled");
  });
});
