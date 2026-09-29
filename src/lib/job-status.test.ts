import { describe, expect, it } from "vitest";
import { jobStatus } from "@/lib/job-status";

describe("jobStatus", () => {
  const now = new Date("2026-09-29T12:00:00.000Z");

  it("is open with no closes_at", () => {
    expect(jobStatus({}, now)).toBe("open");
  });

  it("is open before closes_at", () => {
    const closesAt = new Date("2026-10-01T00:00:00.000Z");
    expect(jobStatus({ closesAt }, now)).toBe("open");
  });

  it("is closed after closes_at", () => {
    const closesAt = new Date("2026-09-28T00:00:00.000Z");
    expect(jobStatus({ closesAt }, now)).toBe("closed");
  });

  it("is filled once filled_at is set, even before closes_at", () => {
    const closesAt = new Date("2026-10-01T00:00:00.000Z");
    const filledAt = new Date("2026-09-29T10:00:00.000Z");
    expect(jobStatus({ closesAt, filledAt }, now)).toBe("filled");
  });

  it("is cancelled regardless of other fields", () => {
    const closesAt = new Date("2026-10-01T00:00:00.000Z");
    const cancelledAt = new Date("2026-09-29T09:00:00.000Z");
    expect(jobStatus({ closesAt, cancelledAt }, now)).toBe("cancelled");
  });
});
