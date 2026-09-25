import { describe, expect, it } from "vitest";
import { freshnessState } from "@/lib/freshness";

// All fixture dates are constructed as UTC instants; the function itself converts
// to IST calendar days, so we reason about IST directly in each test's comment.

describe("freshnessState", () => {
  it("verifiedAt 3 days ago → checked, fresh", () => {
    const now = new Date("2027-01-10T04:00:00.000Z");
    const verifiedAt = new Date("2027-01-07T04:00:00.000Z");
    const retrievedAt = new Date("2027-01-01T04:00:00.000Z");
    const state = freshnessState({ retrievedAt, verifiedAt }, now);
    expect(state).toMatchObject({ mode: "checked", stale: false, daysAgo: 3 });
  });

  it("verifiedAt 8 days ago → checked, stale", () => {
    const now = new Date("2027-01-10T04:00:00.000Z");
    const verifiedAt = new Date("2027-01-02T04:00:00.000Z");
    const retrievedAt = new Date("2027-01-01T04:00:00.000Z");
    const state = freshnessState({ retrievedAt, verifiedAt }, now);
    expect(state).toMatchObject({ mode: "checked", stale: true, daysAgo: 8 });
  });

  it("verifiedAt exactly 7 days ago → checked, still fresh (boundary)", () => {
    const now = new Date("2027-01-10T04:00:00.000Z");
    const verifiedAt = new Date("2027-01-03T04:00:00.000Z");
    const retrievedAt = new Date("2027-01-01T04:00:00.000Z");
    const state = freshnessState({ retrievedAt, verifiedAt }, now);
    expect(state).toMatchObject({ mode: "checked", stale: false, daysAgo: 7 });
  });

  it("verifiedAt absent → retrieved mode, keyed off retrievedAt, fresh", () => {
    const now = new Date("2027-01-10T04:00:00.000Z"); // 2027-01-10 09:30 IST
    const retrievedAt = new Date("2027-01-05T04:00:00.000Z"); // 2027-01-05 09:30 IST
    const state = freshnessState({ retrievedAt, verifiedAt: null }, now);
    expect(state).toMatchObject({ mode: "retrieved", stale: false, dateLabel: "5 Jan 2027" });
  });

  it("verifiedAt absent → retrieved mode, stale when retrievedAt is over 7 days old", () => {
    const now = new Date("2027-01-10T04:00:00.000Z");
    const retrievedAt = new Date("2026-12-01T04:00:00.000Z");
    const state = freshnessState({ retrievedAt, verifiedAt: undefined }, now);
    expect(state).toMatchObject({ mode: "retrieved", stale: true, dateLabel: "1 Dec 2026" });
  });

  it("verifiedAt present takes priority over retrievedAt even when retrievedAt is much older", () => {
    const now = new Date("2027-01-10T04:00:00.000Z");
    const retrievedAt = new Date("2026-01-01T04:00:00.000Z"); // over a year old, would be stale
    const verifiedAt = new Date("2027-01-09T04:00:00.000Z"); // verified yesterday
    const state = freshnessState({ retrievedAt, verifiedAt }, now);
    expect(state).toMatchObject({ mode: "checked", stale: false, daysAgo: 1 });
  });
});
