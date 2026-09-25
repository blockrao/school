import { describe, expect, it } from "vitest";
import { formatIndianPhone, normalizeIndianPhone } from "@/lib/phone";

describe("normalizeIndianPhone", () => {
  it("accepts a bare 10-digit mobile number", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
  });

  it("accepts numbers with a 91 prefix, spaces or dashes", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("91-9876543210")).toBe("+919876543210");
  });

  it("rejects numbers not starting with 6-9", () => {
    expect(normalizeIndianPhone("5876543210")).toBeNull();
  });

  it("rejects the wrong number of digits", () => {
    expect(normalizeIndianPhone("987654321")).toBeNull();
    expect(normalizeIndianPhone("98765432100")).toBeNull();
  });
});

describe("formatIndianPhone", () => {
  it("formats for display", () => {
    expect(formatIndianPhone("+919876543210")).toBe("+91 98765 43210");
  });
});
