import { describe, expect, it } from "vitest";
import { buildCoverage } from "@/lib/coverage";
import type { DecisionSlot } from "@/lib/decision-strip";

const allUnverifiedSlots: DecisionSlot[] = [
  { id: "admissions", label: "Admissions", status: "unverified" },
  { id: "annual_fee", label: "Annual fee", status: "unverified" },
  { id: "entry_classes", label: "Entry classes", status: "unverified" },
  { id: "student_teacher_ratio", label: "Student–teacher ratio", status: "unverified" },
  { id: "board_result", label: "Board result", status: "unverified" },
  { id: "location", label: "Location", status: "unverified" },
];

const allAvailableSlots: DecisionSlot[] = [
  { id: "admissions", label: "Admissions", status: "available", value: "Closes 15 Nov 2026" },
  { id: "annual_fee", label: "Annual fee", status: "unverified" }, // fee never has a live read path today
  { id: "entry_classes", label: "Entry classes", status: "available", value: "Class 1–12" },
  { id: "student_teacher_ratio", label: "Student–teacher ratio", status: "unverified" },
  { id: "board_result", label: "Board result", status: "unverified" },
  { id: "location", label: "Location", status: "available", value: "Whitefield, Bengaluru" },
];

const noPageFacts = {
  hasIdentity: false,
  hasBoardAffiliation: false,
  hasContact: false,
  hasStaff: false,
};

describe("buildCoverage", () => {
  it("always returns exactly ten topics, in a fixed order", () => {
    const topics = buildCoverage(allUnverifiedSlots, noPageFacts);
    expect(topics.map((t) => t.id)).toEqual([
      "identity",
      "board_affiliation",
      "classes_offered",
      "location",
      "contact",
      "staff",
      "admissions",
      "annual_fee",
      "board_results",
      "facilities_safety",
    ]);
  });

  it("a fully sparse school has every topic being_verified", () => {
    const topics = buildCoverage(allUnverifiedSlots, noPageFacts);
    expect(topics.every((t) => t.status === "being_verified")).toBe(true);
  });

  it("reads classes/location/admissions/fee/board-results straight off the decision slots, never re-deriving them", () => {
    const topics = buildCoverage(allAvailableSlots, noPageFacts);
    const byId = Object.fromEntries(topics.map((t) => [t.id, t.status]));
    expect(byId.classes_offered).toBe("known");
    expect(byId.location).toBe("known");
    expect(byId.admissions).toBe("known");
    expect(byId.annual_fee).toBe("being_verified"); // slot says unverified -> stays being_verified
    expect(byId.board_results).toBe("being_verified");
  });

  it("identity, board & affiliation, contact and staff follow the page facts independently of slot data", () => {
    const topics = buildCoverage(allUnverifiedSlots, {
      hasIdentity: true,
      hasBoardAffiliation: true,
      hasContact: true,
      hasStaff: true,
    });
    const byId = Object.fromEntries(topics.map((t) => [t.id, t.status]));
    expect(byId.identity).toBe("known");
    expect(byId.board_affiliation).toBe("known");
    expect(byId.contact).toBe("known");
    expect(byId.staff).toBe("known");
  });

  it("facilities & safety is always being_verified, regardless of every other input", () => {
    const sparse = buildCoverage(allUnverifiedSlots, noPageFacts);
    const rich = buildCoverage(allAvailableSlots, {
      hasIdentity: true,
      hasBoardAffiliation: true,
      hasContact: true,
      hasStaff: true,
    });
    expect(sparse.find((t) => t.id === "facilities_safety")?.status).toBe("being_verified");
    expect(rich.find((t) => t.id === "facilities_safety")?.status).toBe("being_verified");
  });

  it("never marks a topic known just because a neighboring page fact is true", () => {
    const topics = buildCoverage(allUnverifiedSlots, {
      hasIdentity: true,
      hasBoardAffiliation: false,
      hasContact: false,
      hasStaff: false,
    });
    const byId = Object.fromEntries(topics.map((t) => [t.id, t.status]));
    expect(byId.identity).toBe("known");
    expect(byId.board_affiliation).toBe("being_verified");
    expect(byId.contact).toBe("being_verified");
    expect(byId.staff).toBe("being_verified");
  });
});
