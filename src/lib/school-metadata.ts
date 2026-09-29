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
