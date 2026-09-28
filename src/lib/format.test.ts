import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";

describe("formatCurrency", () => {
  it("uses Indian digit grouping, not Western thousands", () => {
    expect(formatCurrency(120000)).toBe("₹1,20,000");
  });

  it("rounds to whole rupees by default", () => {
    expect(formatCurrency(999.6)).toBe("₹1,000");
  });

  it("never falls back to plain string concatenation for small amounts", () => {
    expect(formatCurrency(750)).toBe("₹750");
  });
});

describe("formatNumber", () => {
  it("groups with Indian digit placement", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
  });
});

describe("formatDate", () => {
  it("renders a short day/month/year label by default", () => {
    expect(formatDate(new Date(Date.UTC(2026, 9, 31)))).toBe("31 Oct 2026");
  });
});

describe("formatDateTime", () => {
  it("includes a time component", () => {
    const label = formatDateTime(new Date(Date.UTC(2026, 9, 31, 10, 30)));
    expect(label).toContain("31 Oct 2026");
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });
});
