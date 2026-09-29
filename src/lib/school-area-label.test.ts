import { describe, expect, it } from "vitest";

import { schoolAreaLabel } from "./school-area-label";

// Identity Layer Pilot & Closure, item 5 (29 Sep 2026) — regression test for
// the projection-consistency defect found during verification: schoolMetadata()
// (<title>/meta) and webPageJsonLd.name in entity-page.tsx used two
// independently-written area label computations that silently disagreed
// whenever a school had both a locality and a city (title kept both, JSON-LD
// dropped the city). Both call sites now share this one function; this test
// locks in its actual join behavior so a future edit to either call site
// can't quietly diverge again.
describe("schoolAreaLabel", () => {
  it("joins locality and city when both are known", () => {
    expect(schoolAreaLabel("Sirsi Road", "Jaipur")).toBe("Sirsi Road, Jaipur");
  });

  it("falls back to city alone when locality is unknown", () => {
    expect(schoolAreaLabel(null, "Jaipur")).toBe("Jaipur");
  });

  it("falls back to locality alone when city is unknown", () => {
    expect(schoolAreaLabel("Sirsi Road", undefined)).toBe("Sirsi Road");
  });

  it("falls back to India when neither is known", () => {
    expect(schoolAreaLabel(null, undefined)).toBe("India");
  });
});
