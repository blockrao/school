import type { PublicSchool, PublicSchoolBoard } from "@/contracts";

/**
 * Highest class covered by a secondary board exam is 10/12; a school whose
 * grade span tops out at class 8 or below has no board to be affiliated to.
 * `max_class` is stored as `c1`..`c12`; anything else (null, malformed) is
 * "unknown" and deliberately NOT treated as elementary — the exemption below
 * must be earned by a known grade span, not by missing data.
 */
export function isKnownElementaryOnly(maxClass: string | null): boolean {
  const m = /^c(\d{1,2})$/.exec(maxClass ?? "");
  return m != null && Number(m[1]) <= 8;
}

/** A phone entry counts only if it carries at least 6 digits — the data has
 * `['']` / `[null]` arrays (3,446 published rows as of 4 Oct 2026) that an
 * "array is non-empty" check wrongly accepted as a contact channel. */
export function hasUsablePhone(phone: PublicSchool["phone"]): boolean {
  return (phone ?? []).some((p) => (p ?? "").replace(/\D/g, "").length >= 6);
}

export function hasUsableEmail(email: PublicSchool["email"]): boolean {
  return (email ?? []).some((e) => (e ?? "").includes("@"));
}

/**
 * The L2 render/index gate (docs/spec/data-and-trust.md §4, D-114, revised
 * 4 Oct 2026 — Prav): name, address + pincode, a reachable contact channel
 * (usable phone, website, or email), and — only for schools that teach class
 * 9 or above — a CBSE/CISCE affiliation. Below this, the page still renders
 * (never 404s — it's a real canonical URL) but `schoolMetadata()` emits
 * `noindex,follow` rather than leaving it indexable by default, so a sparse
 * record can't sit in Google's index while evidence is still being gathered.
 * `buildCitySitemapResponse()` runs the same function so the sitemap never
 * lists a URL the page itself marks noindex.
 *
 * What changed on 4 Oct and why (numbers from the live DB that day, 6,538
 * published schools):
 *  - Board is required only when the school teaches class 9+. 3,142 published
 *    schools top out at class 8; there is no board exam at that level, so the
 *    old unconditional board requirement hid every elementary school forever
 *    (not "until data arrives" — the data cannot exist). Unknown grade span
 *    still requires a board (see isKnownElementaryOnly).
 *  - Email counts as a contact channel. 5,226 published schools have one; the
 *    phone data is largely blank or STD-code-less landlines.
 *  - Blank phone entries no longer count (bug: 87 pages were indexed with no
 *    real contact at all).
 *  Effect: 1,757 → 3,956 indexable pages. The remaining board-blocked set is
 *  1,396 secondary schools on a state board, excluded by the CBSE/ICSE-only
 *  display policy (db/views/046_public_school_boards.sql) — a product
 *  decision, not a data gap.
 *
 * Deliberately field presence, not a completeness score: this pipeline only
 * ever populates these columns from a sourced value (see SourceLine /
 * field_provenance elsewhere on the school page), so presence already implies
 * provenance without a second, heavier per-field evidence join just for the
 * gate. Keep this in sync with data-and-trust.md §4's L2 row. Pure and
 * testable without a DB or a server-only env import in the loop.
 */
export function meetsIndexabilityGate(
  school: Pick<
    PublicSchool,
    "name_en" | "address" | "pincode" | "phone" | "website" | "email" | "max_class"
  >,
  board: Pick<PublicSchoolBoard, "board_name"> | null,
): boolean {
  const hasIdentity = school.name_en != null;
  const hasAddress = Boolean(school.address) && Boolean(school.pincode);
  const boardSatisfied = board != null || isKnownElementaryOnly(school.max_class);
  const hasContactChannel =
    hasUsablePhone(school.phone) || Boolean(school.website) || hasUsableEmail(school.email);
  return hasIdentity && hasAddress && boardSatisfied && hasContactChannel;
}

/**
 * Increment 11 (Entity Page Quality) — `schoolMetadata()` in entity-page.tsx
 * used to unconditionally promise "board, grades, fees and admission dates"
 * in every school's meta description, regardless of whether any of that was
 * actually known. Fees has no data pipeline at all (0 rows anywhere, no
 * public projection — confirmed in the Increment 10 closure audit), so it's
 * dropped entirely here rather than conditioned on data that can never exist
 * under the current architecture. Board/grades are only asserted when
 * actually known. "Admissions, facts and contact details" names real
 * sections every school page has — true regardless of whether admissions or
 * facts are populated yet — rather than promising a specific fact value (an
 * admission date) that usually isn't set. Pure/testable, same style as
 * record-badge.ts/provenance.ts.
 */
export function buildSchoolMetaDescription(input: {
  name: string;
  areaLabel: string;
  boardName: string | null;
  /** Already-formatted grade range, e.g. "Class 1–12" or "Not yet published". */
  grades: string;
}): string {
  const { name, areaLabel, boardName, grades } = input;

  const knownFacts: string[] = [];
  if (boardName) knownFacts.push(`${boardName} affiliated`);
  if (grades !== "Not yet published") knownFacts.push(grades);
  const factsPhrase = knownFacts.length > 0 ? `${knownFacts.join(", ")} — ` : "";

  return `${name} in ${areaLabel}: ${factsPhrase}admissions, facts and contact details.`;
}

/**
 * Title-metadata correction (29 Sep 2026) — same principle as
 * buildSchoolMetaDescription above (generic real section names, never a
 * specific admission date or a Fees clause with no data pipeline behind it),
 * pulled into its own function for the exact reason schoolAreaLabel was:
 * this string is used in two places (schoolMetadata()'s <title> and
 * entity-page.tsx's webPageJsonLd.name, which is locked to match it exactly —
 * see that assignment's "Identity projection consistency" comment) and a
 * second inline copy is how they silently drifted apart before.
 */
export function schoolPageTitle(name: string, areaLabel: string): string {
  return `${name}, ${areaLabel}: Admissions, Facts & Contact · SchoolOye`;
}
