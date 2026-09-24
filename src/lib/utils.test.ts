import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps both classes when they're unrelated utilities (font-size + color)", () => {
    expect(cn("text-meta", "text-ink")).toBe("text-meta text-ink");
  });

  it("keeps only the later class when both set font-size", () => {
    expect(cn("text-body", "text-meta")).toBe("text-meta");
  });

  it("resolves our custom radius scale (rounded-sheet) against the default scale", () => {
    expect(cn("rounded-md", "rounded-sheet")).toBe("rounded-sheet");
  });

  it("resolves our custom shadow scale (shadow-card) against the default scale", () => {
    expect(cn("shadow-card", "shadow-none")).toBe("shadow-none");
  });
});
