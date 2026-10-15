import { describe, expect, it } from "vitest";
import { boardHubSlug, parseBoardHubSegment } from "./board-slug";

describe("board hub slugs", () => {
  it("maps known boards to short slugs", () => {
    expect(boardHubSlug("Central Board of Secondary Education")).toBe("cbse");
    expect(boardHubSlug("Council for the Indian School Certificate Examinations (ICSE/ISC)")).toBe(
      "icse",
    );
    expect(boardHubSlug("Board of School Education Haryana")).toBe(
      "board-of-school-education-haryana",
    );
  });
  it("parses a hub segment", () => {
    expect(parseBoardHubSegment("cbse-schools")).toBe("cbse");
    expect(parseBoardHubSegment("sadar-bazaar")).toBeNull();
  });
});
