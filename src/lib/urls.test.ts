import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARCHIVE_YEAR_RE,
  cityPath,
  homePath,
  isValidEntitySlug,
  localityPath,
  lp,
  SCHOOL_RESERVED_SLUGS,
  schoolPath,
  statePath,
} from "@/lib/urls";

// CI invariants from docs/spec/urls-and-routing.md §13 (D-121).

describe("public URL builders", () => {
  it("puts English at the root and other languages under /{lang}", () => {
    expect(homePath("en")).toBe("/");
    expect(homePath("hi")).toBe("/hi");
    expect(lp("en", "/exams/rms-cet")).toBe("/exams/rms-cet");
    expect(lp("hi", "/exams/rms-cet")).toBe("/hi/exams/rms-cet");
  });

  it("builds entity and discovery paths without ids or /en", () => {
    expect(schoolPath("en", "gyan-devi-public-school-sr-sec")).toBe(
      "/school/gyan-devi-public-school-sr-sec",
    );
    expect(statePath("en", "haryana")).toBe("/schools/haryana");
    expect(cityPath("en", "haryana", "gurugram")).toBe("/schools/haryana/gurugram");
    expect(localityPath("en", "rajasthan", "jaipur", "mansarovar")).toBe(
      "/schools/rajasthan/jaipur/mansarovar",
    );
  });
});

describe("slug rules (§3)", () => {
  it("accepts lowercase hyphenated slugs up to 60 chars", () => {
    expect(isValidEntitySlug("dps-gurugram-sector-67")).toBe(true);
    expect(isValidEntitySlug("a".repeat(60))).toBe(true);
  });

  it("rejects bad format and over-length slugs", () => {
    for (const bad of ["DPS", "dps--x", "-dps", "dps-", "dps_x", "d p s", "a".repeat(61)]) {
      expect(isValidEntitySlug(bad)).toBe(false);
    }
  });

  it("keeps the reserved-word list identical to the SQL minting function", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260928120000_canonical_school_slugs.sql"),
      "utf8",
    );
    const block = /candidate = any \(array\[([\s\S]*?)\]\)/.exec(sql)?.[1] ?? "";
    const sqlWords = [...block.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    expect(sqlWords).toEqual([...SCHOOL_RESERVED_SLUGS].sort());
  });

  it("reserves every campus view segment and language code", () => {
    for (const word of ["admissions", "fees", "en", "hi", "new", "search", "compare"]) {
      expect(SCHOOL_RESERVED_SLUGS).toContain(word);
    }
  });
});

describe("archive year format (§4)", () => {
  it("accepts exactly YYYY-YY", () => {
    expect(ARCHIVE_YEAR_RE.test("2027-28")).toBe(true);
  });

  it("rejects other year shapes", () => {
    for (const bad of ["2027-2028", "2027", "27-28", "2027_28", "2027-28x"]) {
      expect(ARCHIVE_YEAR_RE.test(bad)).toBe(false);
    }
  });
});
