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

  it("404s untranslated /hi pages instead of serving an English mirror", () => {
    expect(routeDecision("/hi")).toEqual({ type: "rewrite", to: "/en/__untranslated" });
    expect(routeDecision("/hi/school/dps-jaipur")).toEqual({
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
