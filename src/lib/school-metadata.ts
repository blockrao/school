import type { PublicSchool, PublicSchoolBoard } from "@/contracts";

/**
 * Indexability & Metadata Alignment v1 (29 Sep 2026) — the L2 render/index gate
 * (MVP, D-114; docs/spec/data-and-trust.md §4): name, address + pincode, board,
 * and phone or website. Below this, the page still renders (never 404s — it's
 * a real canonical URL) but `schoolMetadata()` emits `noindex,follow` rather
 * than leaving it indexable by default, so a sparse record can't sit in
 * Google's index while evidence is still being gathered. Government schools
 * follow this same rule — D-114 superseded the earlier government-only L3
 * carve-out (D-092); seo-geo.md previously described that superseded rule and
 * has been corrected alongside this.
 *
 * Deliberately field presence, not a completeness score: this pipeline only
 * ever populates these columns from a sourced value (see SourceLine /
 * field_provenance elsewhere on the school page), so presence already implies
 * provenance without a second, heavier per-field evidence join just for the
 * gate. Keep this list in sync with data-and-trust.md §4's L2 row if that
 * table ever changes. Pulled in here rather than left inline in
 * entity-page.tsx for the same reason as schoolPageTitle/
 * buildSchoolMetaDescription above: pure and testable without a DB or a
 * server-only env import in the loop.
 */
export function meetsIndexabilityGate(
  school: Pick<PublicSchool, "name_en" | "address" | "pincode" | "phone" | "website">,
  board: Pick<PublicSchoolBoard, "board_name"> | null,
): boolean {
  const hasIdentity = school.name_en != null;
  const hasAddress = Boolean(school.address) && Boolean(school.pincode);
  const hasBoard = board != null;
  const hasContactChannel = Boolean((school.phone && school.phone.length > 0) || school.website);
  return hasIdentity && hasAddress && hasBoard && hasContactChannel;
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
