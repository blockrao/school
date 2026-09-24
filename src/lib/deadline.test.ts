import { describe, expect, it } from "vitest";
import { deadlineState } from "@/lib/deadline";

// All fixture dates are constructed as UTC instants; the function itself converts
// to IST calendar days, so we reason about IST directly in each test's comment.

describe("deadlineState", () => {
  it("7 days away closes → closing-soon (red)", () => {
    const now = new Date("2027-01-01T04:00:00.000Z"); // 2027-01-01 09:30 IST
    const closesAt = new Date("2027-01-08T04:00:00.000Z"); // 2027-01-08 09:30 IST
    const state = deadlineState({ closesAt }, now);
    expect(state.status).toBe("closing-soon");
    expect(state).toMatchObject({ daysUntilClose: 7 });
  });

  it("8 days away closes → open (ink)", () => {
    const now = new Date("2027-01-01T04:00:00.000Z");
    const closesAt = new Date("2027-01-09T04:00:00.000Z");
    const state = deadlineState({ closesAt }, now);
    expect(state.status).toBe("open");
    expect(state).toMatchObject({ daysUntilClose: 8 });
  });

  it("0 days away (today) → deadline-day", () => {
    const now = new Date("2027-01-01T04:00:00.000Z"); // 2027-01-01 09:30 IST
    const closesAt = new Date("2027-01-01T18:00:00.000Z"); // 2027-01-01 23:30 IST, same IST day
    const state = deadlineState({ closesAt }, now);
    expect(state.status).toBe("deadline-day");
  });

  it("closesAt 23:59 IST today, evaluated at 18:40 UTC same UTC day (= 00:10 IST next day) → closed", () => {
    // 2027-03-10 23:59 IST = 2027-03-10 18:29 UTC
    const closesAt = new Date("2027-03-10T18:29:00.000Z");
    // 2027-03-10 18:40 UTC = 2027-03-11 00:10 IST (next IST calendar day)
    const now = new Date("2027-03-10T18:40:00.000Z");
    const state = deadlineState({ closesAt }, now);
    expect(state.status).toBe("closed");
  });

  it("closesAt 00:30 IST tomorrow, evaluated at 23:00 IST today → closing-soon, 1 day", () => {
    // "today" in IST = 2027-03-10. now = 2027-03-10 23:00 IST = 2027-03-10 17:30 UTC
    const now = new Date("2027-03-10T17:30:00.000Z");
    // closesAt = 2027-03-11 00:30 IST (tomorrow) = 2027-03-10 19:00 UTC
    const closesAt = new Date("2027-03-10T19:00:00.000Z");
    const state = deadlineState({ closesAt }, now);
    expect(state.status).toBe("closing-soon");
    expect(state).toMatchObject({ daysUntilClose: 1 });
  });

  it("opensAt in the future → upcoming (dashed)", () => {
    const now = new Date("2027-01-01T04:00:00.000Z");
    const opensAt = new Date("2027-02-01T04:00:00.000Z");
    const state = deadlineState({ opensAt }, now);
    expect(state.status).toBe("upcoming");
  });

  it("no dates at all → not-announced", () => {
    const now = new Date("2027-01-01T04:00:00.000Z");
    const state = deadlineState({}, now);
    expect(state.status).toBe("not-announced");
  });

  it("closesAt in the past → closed", () => {
    const now = new Date("2027-01-10T04:00:00.000Z");
    const closesAt = new Date("2027-01-01T04:00:00.000Z");
    const state = deadlineState({ closesAt }, now);
    expect(state.status).toBe("closed");
  });

  it("seatsNow present → seats-now, regardless of dates", () => {
    const now = new Date("2027-01-01T04:00:00.000Z");
    const state = deadlineState({ seatsNow: { count: 2, grade: "Cl. 4" } }, now);
    expect(state.status).toBe("seats-now");
    expect(state).toMatchObject({ count: 2, grade: "Cl. 4" });
  });

  describe("opensAt past/today with no closesAt → open-no-deadline", () => {
    it("opensAt yesterday, no closesAt", () => {
      const now = new Date("2027-01-10T04:00:00.000Z");
      const opensAt = new Date("2027-01-09T04:00:00.000Z");
      const state = deadlineState({ opensAt }, now);
      expect(state.status).toBe("open-no-deadline");
      expect(state).toMatchObject({ big: "—" });
    });

    it("opensAt today, no closesAt", () => {
      const now = new Date("2027-01-10T04:00:00.000Z");
      const opensAt = new Date("2027-01-10T04:00:00.000Z");
      const state = deadlineState({ opensAt }, now);
      expect(state.status).toBe("open-no-deadline");
    });

    it("opensAt in the past AND closesAt in the past → still closed, not open-no-deadline", () => {
      const now = new Date("2027-01-10T04:00:00.000Z");
      const opensAt = new Date("2026-12-01T04:00:00.000Z");
      const closesAt = new Date("2027-01-01T04:00:00.000Z");
      const state = deadlineState({ opensAt, closesAt }, now);
      expect(state.status).toBe("closed");
    });
  });

  describe('date-only closesAt string ("YYYY-MM-DD", parsed by JS as UTC midnight)', () => {
    // new Date("2026-10-31") = 2026-10-31T00:00:00.000Z = 2026-10-31 05:30 IST —
    // since IST is UTC+5:30 (positive), UTC midnight of day D always lands within
    // day D in IST, so this never silently rolls onto the wrong IST calendar day.
    const closesAt = new Date("2026-10-31");

    it("00:10 IST on the 31st → deadline-day", () => {
      // 00:10 IST Oct 31 = 18:40 UTC Oct 30
      const now = new Date("2026-10-30T18:40:00.000Z");
      expect(deadlineState({ closesAt }, now).status).toBe("deadline-day");
    });

    it("12:00 IST on the 31st → deadline-day", () => {
      // 12:00 IST Oct 31 = 06:30 UTC Oct 31
      const now = new Date("2026-10-31T06:30:00.000Z");
      expect(deadlineState({ closesAt }, now).status).toBe("deadline-day");
    });

    it("23:59 IST on the 31st → deadline-day", () => {
      // 23:59 IST Oct 31 = 18:29 UTC Oct 31
      const now = new Date("2026-10-31T18:29:00.000Z");
      expect(deadlineState({ closesAt }, now).status).toBe("deadline-day");
    });

    it("00:01 IST on Nov 1 → closed", () => {
      // 00:01 IST Nov 1 = 18:31 UTC Oct 31
      const now = new Date("2026-10-31T18:31:00.000Z");
      expect(deadlineState({ closesAt }, now).status).toBe("closed");
    });
  });
});
