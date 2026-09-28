import { describe, expect, it } from "vitest";
import { normalizeExternalUrl } from "@/lib/external-url";

describe("normalizeExternalUrl", () => {
  it("adds https:// to a bare domain with no scheme", () => {
    expect(normalizeExternalUrl("www.vgschool.in")).toBe("https://www.vgschool.in");
    expect(normalizeExternalUrl("vgschool.in")).toBe("https://vgschool.in");
  });

  it("leaves an already-schemed URL untouched", () => {
    expect(normalizeExternalUrl("https://vgschool.in")).toBe("https://vgschool.in");
    expect(normalizeExternalUrl("http://vgschool.in")).toBe("http://vgschool.in");
    // Never downgrades/upgrades a scheme that's already present.
    expect(normalizeExternalUrl("http://www.vgschool.in/admissions")).toBe(
      "http://www.vgschool.in/admissions",
    );
  });

  it("leaves a protocol-relative URL untouched", () => {
    expect(normalizeExternalUrl("//vgschool.in")).toBe("//vgschool.in");
  });

  it("returns null for empty/missing input", () => {
    expect(normalizeExternalUrl(null)).toBeNull();
    expect(normalizeExternalUrl(undefined)).toBeNull();
    expect(normalizeExternalUrl("")).toBeNull();
    expect(normalizeExternalUrl("   ")).toBeNull();
  });

  it("returns null rather than guessing for a value that isn't domain-shaped", () => {
    expect(normalizeExternalUrl("not a url")).toBeNull();
    expect(normalizeExternalUrl("N/A")).toBeNull();
    expect(normalizeExternalUrl("contact school for details")).toBeNull();
  });

  it("preserves a path/query already on a bare domain", () => {
    expect(normalizeExternalUrl("www.vgschool.in/admissions?year=2027")).toBe(
      "https://www.vgschool.in/admissions?year=2027",
    );
  });
});
