import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("South West Delhi")).toBe("south-west-delhi");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("Delhi & NCR!!")).toBe("delhi-ncr");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  Delhi  ")).toBe("delhi");
  });
});
