import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SDP-05 follow-through / SDP closure Workstream B (B1) — "the mismatch between
 * sub-navigation and DOM order must disappear" and "an automated assertion is
 * required." entity-page.tsx already has a single `sections` array as the one
 * source of truth for both the shortcuts row and the sticky sub-nav (see its
 * header comment), kept in sync with the JSX by hand. This test makes that sync
 * a checked invariant instead of a code-review convention: it statically parses
 * the real source file for (1) the nav's declared id order and (2) the order
 * section headings actually appear in the JSX, and fails if they ever diverge —
 * catching exactly the "nav says X before Y, DOM renders Y before X" class of
 * bug already found and fixed once during the Gyan Deep production audit.
 *
 * This is a static-source check, not a rendered-DOM test: SchoolView is an
 * async server component that fetches live data (Supabase), so it isn't
 * render-tested anywhere in this codebase's existing pattern (see
 * public-adapter.ts — DB-backed code is verified in production, not unit
 * tests). Parsing the source text is the same idea applied without a DB.
 */

const entityPagePath = path.join(__dirname, "entity-page.tsx");
const source = fs.readFileSync(entityPagePath, "utf8");

describe("SchoolView sticky sub-nav order matches rendered section order", () => {
  it("declares the nav's id order", () => {
    const navIds = extractNavIds(source);
    expect(navIds.length).toBeGreaterThan(0);
    expect(navIds).toEqual([
      "facts-heading",
      "admissions-heading",
      "admission-updates-heading",
      "news-heading",
      "events-heading",
      "jobs-heading",
      "location-heading",
      "teachers-heading",
      "coverage-heading",
      "similar-heading",
      "contact-heading",
    ]);
  });

  it("has no orphan nav item (every nav id has a matching rendered section)", () => {
    const navIds = extractNavIds(source);
    const domOrder = extractDomHeadingOrder(source);
    for (const id of navIds) {
      expect(domOrder).toContain(id);
    }
  });

  it("renders sections in exactly the order the nav declares", () => {
    const navIds = extractNavIds(source);
    const domOrder = extractDomHeadingOrder(source);
    const domOrderFilteredToNavIds = domOrder.filter((id) => navIds.includes(id));
    expect(domOrderFilteredToNavIds).toEqual(navIds);
  });
});

/** Pulls the `id: "..."` values, in order, out of the `sections` array literal —
 * the single source of truth for both the shortcuts row and the sticky sub-nav. */
function extractNavIds(src: string): string[] {
  const block = src.match(
    /const sections: \{ id: string; label: string; show: boolean \}\[\] = \[([\s\S]*?)\n {2}\]\.filter/,
  );
  if (!block) {
    throw new Error(
      "Couldn't find the `sections` array in entity-page.tsx — update this test's regex if its declaration shape changed.",
    );
  }
  return [...block[1].matchAll(/id: "([a-z-]+)"/g)].map((m) => m[1]);
}

/** Pulls every section-heading id out of the JSX, in the order it's actually
 * rendered. Most sections declare `aria-labelledby="<id>"` directly on their
 * <section>. CoverageCard is the one exception — it renders its own
 * `coverage-heading` internally (components/ui/coverage-card.tsx) — so its call
 * site in entity-page.tsx stands in for its position here. */
function extractDomHeadingOrder(src: string): string[] {
  const markers: { offset: number; id: string }[] = [];
  for (const m of src.matchAll(/aria-labelledby="([a-z-]+-heading)"/g)) {
    markers.push({ offset: m.index ?? 0, id: m[1] });
  }
  const coverageCardOffset = src.indexOf("<CoverageCard");
  if (coverageCardOffset === -1) {
    throw new Error("Couldn't find the <CoverageCard> render call in entity-page.tsx.");
  }
  markers.push({ offset: coverageCardOffset, id: "coverage-heading" });
  markers.sort((a, b) => a.offset - b.offset);
  return markers.map((m) => m.id);
}
