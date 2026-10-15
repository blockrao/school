import { describe, expect, it } from "vitest";
import { paginationWindow } from "@/lib/pagination";

describe("paginationWindow", () => {
  it("lists every page when there are few", () => {
    expect(paginationWindow(1, 3)).toEqual([1, 2, 3]);
  });
  it("keeps first two, last two and a window around the current page", () => {
    expect(paginationWindow(8, 16)).toEqual([1, 2, "gap", 6, 7, 8, 9, 10, "gap", 15, 16]);
  });
  it("collapses the gap when the window touches the edges", () => {
    expect(paginationWindow(1, 16)).toEqual([1, 2, 3, "gap", 15, 16]);
    expect(paginationWindow(16, 16)).toEqual([1, 2, "gap", 14, 15, 16]);
  });
});
