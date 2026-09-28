import { describe, expect, it } from "vitest";
import { countWords } from "@/lib/word-count";

describe("countWords", () => {
  it("counts empty and whitespace-only text as zero", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t  ")).toBe(0);
  });

  it("counts plain words", () => {
    expect(countWords("Boys-only campus of the Maheshwari Samaj trust.")).toBe(7);
  });

  it("collapses runs of whitespace and trims the ends", () => {
    expect(countWords("  one   two\nthree  ")).toBe(3);
  });

  it("counts a single word as one", () => {
    expect(countWords("Coed")).toBe(1);
  });
});
