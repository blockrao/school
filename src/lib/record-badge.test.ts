import { describe, expect, it } from "vitest";
import { recordBadge } from "@/lib/record-badge";

describe("recordBadge", () => {
  it("claimed + school_verified is the only Official record state", () => {
    const b = recordBadge("claimed", "school_verified", null);
    expect(b.official).toBe(true);
    expect(b.label).toBe("Official record");
  });

  it("appends the verified date, in IST, when present", () => {
    // 2026-10-02T20:00:00Z is 2026-10-03 01:30 IST — the IST calendar date must win.
    const b = recordBadge("claimed", "school_verified", new Date("2026-10-02T20:00:00Z"));
    expect(b.label).toBe("Official record · verified by school on 3 Oct 2026");
  });

  it("never fabricates a date when last_verified_at is null", () => {
    const b = recordBadge("unclaimed", "unverified", null);
    expect(b.label).toBe("Compiled by SchoolOye from public records");
  });

  it("school_verified without claimed status is not Official (columns move independently)", () => {
    const b = recordBadge("unclaimed", "school_verified", null);
    expect(b.official).toBe(false);
    expect(b.label).toBe("Compiled by SchoolOye from public records");
  });

  it.each(["unverified", "source_verified", "ops_verified"])(
    "claimed + %s is Compiled, not Official — only school_verified counts",
    (verification) => {
      const b = recordBadge("claimed", verification, new Date("2026-09-01T00:00:00Z"));
      expect(b.official).toBe(false);
      // en-IN's short-month formatter spells September "Sept", unlike other months.
      expect(b.label).toBe("Compiled by SchoolOye from public records · 1 Sept 2026");
    },
  );

  it("never says Official for pending or rejected claims either", () => {
    expect(recordBadge("pending", "school_verified", null).official).toBe(false);
    expect(recordBadge("rejected", "school_verified", null).official).toBe(false);
  });
});
