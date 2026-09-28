import { describe, expect, it } from "vitest";
import {
  buildAdmissionsSlot,
  buildDecisionStrip,
  buildEntryClassesSlot,
  buildLocationSlot,
  selectPrimaryAdmission,
  unsupportedSlot,
} from "@/lib/decision-strip";

// Fixed "now" so date-relative assertions (closed vs. still-open) are
// deterministic regardless of when the suite runs.
const NOW = new Date("2026-09-28T00:00:00+05:30");

describe("unsupportedSlot", () => {
  it("is always unverified, whatever label/id it's given", () => {
    const slot = unsupportedSlot("board_result", "Board result");
    expect(slot).toEqual({ id: "board_result", label: "Board result", status: "unverified" });
  });
});

describe("buildAdmissionsSlot", () => {
  it("is unverified when there's no admission row at all", () => {
    expect(buildAdmissionsSlot(null, NOW).status).toBe("unverified");
  });

  it("is unverified when the cycle exists but has no dates and isn't announced", () => {
    const slot = buildAdmissionsSlot(
      {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: null,
        closes_on: null,
        status: "not_announced",
      },
      NOW,
    );
    expect(slot.status).toBe("unverified");
    expect(slot.label).toBe("Admissions 2027-28");
  });

  it("shows the closing date when present, and a registration-from context", () => {
    const slot = buildAdmissionsSlot(
      {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: "2026-09-22",
        closes_on: "2026-11-15",
        status: "open",
      },
      NOW,
    );
    if (slot.status !== "available") throw new Error("expected available");
    expect(slot.value).toBe("Closes 15 Nov 2026");
    expect(slot.context).toBe("Registration from 22 Sept 2026");
  });

  it("falls back to opens_on when closes_on is missing", () => {
    const slot = buildAdmissionsSlot(
      {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: "2026-09-22",
        closes_on: null,
        status: "upcoming",
      },
      NOW,
    );
    if (slot.status !== "available") throw new Error("expected available");
    expect(slot.value).toBe("Opens 22 Sept 2026");
  });

  it("never fabricates a source/notice reference not present in the data", () => {
    const slot = buildAdmissionsSlot(
      {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: null,
        closes_on: "2026-11-15",
        status: "closing_soon",
      },
      NOW,
    );
    if (slot.status !== "available") throw new Error("expected available");
    expect(slot.sourceLabel).toBeUndefined();
  });

  it("shows a plain 'Closed' rather than a misleading past closing date (the DAV Gurugram real-data bug)", () => {
    // Real production row: a 2027-28 nursery cycle whose form window closed
    // 2026-08-12 — well before NOW (2026-09-28) — but whose stored `status`
    // enum hadn't independently been flipped. Before this fix, the slot
    // rendered "Closes 12 Aug 2026" with the same confident styling as a
    // live deadline.
    const slot = buildAdmissionsSlot(
      {
        academic_year: "2027-28",
        class_code: "nursery",
        opens_on: null,
        closes_on: "2026-08-12",
        status: "closed",
      },
      NOW,
    );
    if (slot.status !== "available") throw new Error("expected available");
    expect(slot.value).toBe("Closed");
  });

  it("still shows the real closing date when it is genuinely in the future", () => {
    const slot = buildAdmissionsSlot(
      {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: null,
        closes_on: "2026-11-15",
        status: "open",
      },
      NOW,
    );
    if (slot.status !== "available") throw new Error("expected available");
    expect(slot.value).toBe("Closes 15 Nov 2026");
  });
});

describe("selectPrimaryAdmission", () => {
  it("returns undefined for an empty list", () => {
    expect(selectPrimaryAdmission([])).toBeUndefined();
  });

  it("prefers an open cycle over one that has already closed (the DAV Gurugram multi-cycle case)", () => {
    // Mirrors the real production data: a closed nursery cycle (sorted first
    // by closes_on ascending, since it has a date and the open cycle
    // doesn't) alongside a separately-open Class XI cycle with no date yet.
    const closedNursery = { id: "nursery", status: "closed" };
    const openClassXI = { id: "class-xi", status: "open" };
    expect(selectPrimaryAdmission([closedNursery, openClassXI])).toBe(openClassXI);
  });

  it("falls back to the first row when every cycle is closed or concluded", () => {
    const closed = { id: "a", status: "closed" };
    const resultsOut = { id: "b", status: "results_out" };
    expect(selectPrimaryAdmission([closed, resultsOut])).toBe(closed);
  });

  it("keeps the existing order when the first cycle is already actionable", () => {
    const open = { id: "a", status: "open" };
    const upcoming = { id: "b", status: "upcoming" };
    expect(selectPrimaryAdmission([open, upcoming])).toBe(open);
  });
});

describe("buildEntryClassesSlot", () => {
  it("is unverified when grade range is unknown", () => {
    expect(buildEntryClassesSlot({ min_class: null, max_class: null }).status).toBe("unverified");
  });

  it("is available when a grade range exists", () => {
    const slot = buildEntryClassesSlot({ min_class: "c1", max_class: "c12" });
    expect(slot.status).toBe("available");
  });
});

describe("buildLocationSlot", () => {
  it("is unverified when neither locality nor city is known", () => {
    expect(buildLocationSlot({ locality_name: null, address: null }, null).status).toBe(
      "unverified",
    );
  });

  it("combines locality and city, and surfaces the address as context", () => {
    const slot = buildLocationSlot(
      { locality_name: "Whitefield", address: "ITPL Main Road" },
      "Bengaluru",
    );
    if (slot.status !== "available") throw new Error("expected available");
    expect(slot.value).toBe("Whitefield, Bengaluru");
    expect(slot.context).toBe("ITPL Main Road");
  });

  it("still resolves from city alone when locality is unknown", () => {
    const slot = buildLocationSlot({ locality_name: null, address: null }, "Bengaluru");
    if (slot.status !== "available") throw new Error("expected available");
    expect(slot.value).toBe("Bengaluru");
  });
});

describe("buildDecisionStrip", () => {
  it("always returns exactly six slots, in the design's fixed order", () => {
    const slots = buildDecisionStrip({
      admission: null,
      school: { min_class: null, max_class: null, locality_name: null, address: null },
      cityName: null,
      now: NOW,
    });
    expect(slots.map((s) => s.id)).toEqual([
      "admissions",
      "annual_fee",
      "entry_classes",
      "student_teacher_ratio",
      "board_result",
      "location",
    ]);
  });

  it("annual fee, ratio and board result are unverified even for a fully-populated school", () => {
    const slots = buildDecisionStrip({
      admission: {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: "2026-09-22",
        closes_on: "2026-11-15",
        status: "open",
      },
      school: {
        min_class: "nursery",
        max_class: "c12",
        locality_name: "Whitefield",
        address: "ITPL Main Road",
      },
      cityName: "Bengaluru",
      now: NOW,
    });
    const unverifiedIds = slots.filter((s) => s.status === "unverified").map((s) => s.id);
    expect(unverifiedIds).toEqual(["annual_fee", "student_teacher_ratio", "board_result"]);
  });

  it("every slot is unverified for a genuinely sparse/unclaimed school", () => {
    const slots = buildDecisionStrip({
      admission: null,
      school: { min_class: null, max_class: null, locality_name: null, address: null },
      cityName: null,
      now: NOW,
    });
    expect(slots.every((s) => s.status === "unverified")).toBe(true);
  });
});
