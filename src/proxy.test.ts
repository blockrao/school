import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k",
  },
}));

const { routeDecision } = await import("@/proxy");

// Routing invariants from docs/spec/urls-and-routing.md §8, §11, §12 (D-121).
describe("routeDecision", () => {
  it("serves canonical English paths at the root (internal /en rewrite, no redirect)", () => {
    expect(routeDecision("/")).toEqual({ type: "rewrite", to: "/en" });
    expect(routeDecision("/school/dps-jaipur")).toEqual({
      type: "rewrite",
      to: "/en/school/dps-jaipur",
    });
    expect(routeDecision("/schools/rajasthan/jaipur")).toEqual({
      type: "rewrite",
      to: "/en/schools/rajasthan/jaipur",
    });
    expect(routeDecision("/exams/rms-cet")).toEqual({ type: "rewrite", to: "/en/exams/rms-cet" });
  });

  it("301s /en and /en/{root} to the unprefixed canonical in one hop", () => {
    expect(routeDecision("/en")).toEqual({ type: "redirect", to: "/" });
    expect(routeDecision("/en/exams/rms-cet")).toEqual({ type: "redirect", to: "/exams/rms-cet" });
    expect(routeDecision("/en/school/dps-jaipur")).toEqual({
      type: "redirect",
      to: "/school/dps-jaipur",
    });
  });

  it("lowercases in the same hop", () => {
    expect(routeDecision("/School/DPS-Jaipur")).toEqual({
      type: "redirect",
      to: "/school/dps-jaipur",
    });
    expect(routeDecision("/EN/Exams/RMS-CET")).toEqual({ type: "redirect", to: "/exams/rms-cet" });
  });

  it("sends removed pre-D-121 addresses to a 404, not a redirect (D-122)", () => {
    // /en/{city}/… and /{city}/… have no route any more → Next's not-found page.
    expect(routeDecision("/en/jaipur")).toEqual({ type: "rewrite", to: "/en/jaipur" });
    expect(routeDecision("/jaipur/dps-jaipur-100179")).toEqual({
      type: "rewrite",
      to: "/en/jaipur/dps-jaipur-100179",
    });
  });

  it("redirects /hi pages with a real English equivalent to it, in one hop (never renders a mirror at /hi/)", () => {
    expect(routeDecision("/hi")).toEqual({ type: "redirect", to: "/" });
    expect(routeDecision("/hi/school/dps-jaipur")).toEqual({
      type: "redirect",
      to: "/school/dps-jaipur",
    });
  });

  it("passes /hi/exams/* through to the app router instead of redirecting (2026-09-30: exams have their own per-page Hindi-completeness gate — see @/lib/i18n-completeness)", () => {
    expect(routeDecision("/hi/exams/aissee")).toEqual({
      type: "rewrite",
      to: "/hi/exams/aissee",
    });
    expect(routeDecision("/HI/Exams/AISSEE")).toEqual({
      type: "rewrite",
      to: "/hi/exams/aissee",
    });
  });

  it("still 404s an /hi path with no valid English equivalent", () => {
    expect(routeDecision("/hi/jaipur/dps-jaipur-100179")).toEqual({
      type: "rewrite",
      to: "/en/__untranslated",
    });
  });

  it("passes through non-locale routes and files", () => {
    for (const path of [
      "/api/revalidate",
      "/ops",
      "/portal/team",
      "/robots.txt",
      "/sitemap-jaipur.xml",
      "/_next/x.js",
    ]) {
      expect(routeDecision(path)).toEqual({ type: "pass" });
    }
  });

  it("keeps the markdown twin on the canonical tree", () => {
    expect(routeDecision("/school/dps-jaipur/index.md")).toEqual({
      type: "rewrite",
      to: "/en/school/dps-jaipur/index.md",
    });
  });
});

describe("LOCALE_ROOTS stays in step with src/app/[locale]/", () => {
  it("lists every public route directory, so no route is served at non-canonical spellings", async () => {
    const { readdirSync } = await import("node:fs");
    const { LOCALE_ROOTS } = await import("@/proxy");
    const localeDir = new URL("./app/[locale]/", import.meta.url);
    const entries = readdirSync(localeDir, { withFileTypes: true });
    const dirs: string[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith("_")) continue; // _views and other private folders
      if (e.name.startsWith("(")) {
        // Route groups don't appear in the URL; their children do.
        for (const inner of readdirSync(new URL(`./app/[locale]/${e.name}/`, import.meta.url), {
          withFileTypes: true,
        })) {
          if (inner.isDirectory()) dirs.push(inner.name);
        }
        continue;
      }
      dirs.push(e.name);
    }
    const missing = dirs.filter((d) => !LOCALE_ROOTS.has(d)).sort();
    expect(missing, `routes missing from LOCALE_ROOTS: ${missing.join(", ")}`).toEqual([]);
  });

  it("301s /en/{root} and uppercase for the roots that used to be missing (news, events, jobs)", () => {
    expect(routeDecision("/en/news/some-post")).toEqual({
      type: "redirect",
      to: "/news/some-post",
    });
    expect(routeDecision("/NEWS/some-post")).toEqual({ type: "redirect", to: "/news/some-post" });
    expect(routeDecision("/en/events/x")).toEqual({ type: "redirect", to: "/events/x" });
    expect(routeDecision("/en/jobs/x")).toEqual({ type: "redirect", to: "/jobs/x" });
    expect(routeDecision("/hi/news/x")).toEqual({ type: "redirect", to: "/news/x" });
    expect(routeDecision("/news/some-post")).toEqual({ type: "rewrite", to: "/en/news/some-post" });
  });
});
