import { describe, expect, it } from "vitest";
import { formatGradeRange } from "@/lib/grades";

describe("formatGradeRange", () => {
  it("min_class missing -> 'Up to Class N', never infers the start", () => {
    expect(formatGradeRange(null, "c12")).toBe("Up to Class 12");
  });

  it("both present, different -> range", () => {
    expect(formatGradeRange("c1", "c12")).toBe("Class 1–12");
  });

  it("both present, same -> single class", () => {
    expect(formatGradeRange("c9", "c9")).toBe("Class 9");
  });

  it("max_class missing -> Not yet published, regardless of min", () => {
    expect(formatGradeRange("c1", null)).toBe("Not yet published");
    expect(formatGradeRange(null, null)).toBe("Not yet published");
  });

  it("unrecognized code format -> treated as absent, not guessed", () => {
    expect(formatGradeRange(null, "nursery")).toBe("Not yet published");
  });
});
