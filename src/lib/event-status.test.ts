import { describe, expect, it } from "vitest";
import { eventTemporalStatus } from "@/lib/event-status";

describe("eventTemporalStatus", () => {
  const now = new Date("2026-09-29T12:00:00.000Z");

  it("is upcoming before starts_at", () => {
    const startsAt = new Date("2026-10-01T09:00:00.000Z");
    expect(eventTemporalStatus({ startsAt }, now)).toBe("upcoming");
  });

  it("is ongoing between starts_at and ends_at", () => {
    const startsAt = new Date("2026-09-29T08:00:00.000Z");
    const endsAt = new Date("2026-09-29T18:00:00.000Z");
    expect(eventTemporalStatus({ startsAt, endsAt }, now)).toBe("ongoing");
  });

  it("is ongoing exactly at starts_at with no ends_at (single-instant event)", () => {
    const startsAt = new Date("2026-09-29T12:00:00.000Z");
    expect(eventTemporalStatus({ startsAt }, now)).toBe("ongoing");
  });

  it("is completed after starts_at with no ends_at", () => {
    const startsAt = new Date("2026-09-28T09:00:00.000Z");
    expect(eventTemporalStatus({ startsAt }, now)).toBe("completed");
  });

  it("is completed after ends_at", () => {
    const startsAt = new Date("2026-09-28T08:00:00.000Z");
    const endsAt = new Date("2026-09-28T18:00:00.000Z");
    expect(eventTemporalStatus({ startsAt, endsAt }, now)).toBe("completed");
  });

  it("is cancelled regardless of dates, even for a future event", () => {
    const startsAt = new Date("2026-10-01T09:00:00.000Z");
    const cancelledAt = new Date("2026-09-29T10:00:00.000Z");
    expect(eventTemporalStatus({ startsAt, cancelledAt }, now)).toBe("cancelled");
  });
});
