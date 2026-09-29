import { describe, expect, it } from "vitest";
import type { PublicSchool, PublicSchoolBoard } from "@/contracts";
import {
  buildSchoolMetaDescription,
  meetsIndexabilityGate,
  schoolPageTitle,
} from "@/lib/school-metadata";

type GateSchool = Parameters<typeof meetsIndexabilityGate>[0];
type GateBoard = Parameters<typeof meetsIndexabilityGate>[1];

function gateSchool(overrides: Partial<GateSchool> = {}): GateSchool {
  return {
    name_en: "Gyan Deep Sr.sec." satisfies PublicSchool["name_en"],
    address: "123 MG Road",
    pincode: "302001",
    phone: ["9999999999"],
    website: null,
    ...overrides,
  };
}

function gateBoard(overrides: Partial<GateBoard> = {}): GateBoard {
  return {
    board_name: "Central Board of Secondary Education" satisfies PublicSchoolBoard["board_name"],
    ...overrides,
  };
}

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

describe("meetsIndexabilityGate", () => {
  it("passes a school with name, address+pincode, board, and a phone number", () => {
    expect(meetsIndexabilityGate(gateSchool(), gateBoard())).toBe(true);
  });

  it("passes on website alone, with no phone (phone OR website, not both)", () => {
    expect(
      meetsIndexabilityGate(
        gateSchool({ phone: null, website: "https://example.school" }),
        gateBoard(),
      ),
    ).toBe(true);
  });

  it("fails with no board affiliation at all", () => {
    expect(meetsIndexabilityGate(gateSchool(), null)).toBe(false);
  });

  it("fails with address but no pincode", () => {
    expect(meetsIndexabilityGate(gateSchool({ pincode: null }), gateBoard())).toBe(false);
  });

  it("fails with pincode but no address", () => {
    expect(meetsIndexabilityGate(gateSchool({ address: null }), gateBoard())).toBe(false);
  });

  it("fails with neither phone nor website", () => {
    expect(meetsIndexabilityGate(gateSchool({ phone: null, website: null }), gateBoard())).toBe(
      false,
    );
  });

  it("fails with an empty phone array and no website", () => {
    expect(meetsIndexabilityGate(gateSchool({ phone: [], website: null }), gateBoard())).toBe(
      false,
    );
  });

  it("fails with no name", () => {
    expect(meetsIndexabilityGate(gateSchool({ name_en: null }), gateBoard())).toBe(false);
  });

  it("applies the same rule to a government-affiliated board — no L3 carve-out (D-114 supersedes D-092)", () => {
    expect(meetsIndexabilityGate(gateSchool(), gateBoard({ board_name: "STATE_OTHER" }))).toBe(
      true,
    );
  });
});
