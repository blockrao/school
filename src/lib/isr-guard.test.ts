import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Architecture guard for the school page (15 Oct 2026 SEO audit).
 *
 * /school/[slug] is served as on-demand ISR (cache HIT ~10 ms instead of a
 * ~700 ms database-backed render per crawler hit). A single call to cookies(),
 * headers(), searchParams or a cookie-bound Supabase client anywhere in its
 * render path silently turns that off and the route goes back to
 * `private, no-store`. Per-visitor state belongs in the browser components
 * under src/components/school/ and in /api/viewer.
 */
const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

const FILES = [
  "src/app/[locale]/school/[slug]/page.tsx",
  "src/app/[locale]/_views/entity-page.tsx",
  "src/app/[locale]/_views/resolve.ts",
];
const FORBIDDEN = [
  /from "next\/headers"/,
  /\bcookies\(\)/,
  /\bheaders\(\)/,
  /createSessionClient/,
  /getSessionUser/,
  /\bsearchParams\b(?!\s*\))/,
];

describe("school page stays statically cacheable", () => {
  for (const file of FILES) {
    it(`${file} uses no per-request APIs`, () => {
      const code = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const re of FORBIDDEN) expect(code).not.toMatch(re);
    });
  }

  it("declares ISR params and a revalidate window", () => {
    const page = read("src/app/[locale]/school/[slug]/page.tsx");
    expect(page).toMatch(/export function generateStaticParams/);
    expect(page).toMatch(/export const revalidate = \d+/);
  });

  it("the public city page declares ISR and the listing components do not read the session", () => {
    const page = read("src/app/[locale]/schools/[state]/[city]/page.tsx");
    expect(page).toMatch(/export function generateStaticParams/);
    expect(page).toMatch(/export const revalidate = \d+/);
    for (const f of [
      "src/app/[locale]/_views/place-page.tsx",
      "src/app/[locale]/_views/city-route.tsx",
    ]) {
      const code = read(f)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(code).not.toMatch(
        /getShortlistedSchoolIds|createSessionClient|getSessionUser|next\/headers/,
      );
    }
  });

  it("the public team reader uses the anonymous client", () => {
    const team = read("src/lib/db/school-team.ts");
    const fn = team.slice(team.indexOf("export async function listPublicSchoolTeam"));
    expect(fn.slice(0, 900)).toMatch(/createPublicClient\(\)/);
  });
});
