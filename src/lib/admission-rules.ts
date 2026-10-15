/** Plain-language text for the per-class admissions rows. Never guesses. */

export const SELECTION_METHOD_LABEL: Record<string, string> = {
  first_come: "First come, first served",
  points: "Points-based",
  lottery: "Lottery",
  test: "Entrance test",
  interview: "Interview",
  test_and_interview: "Test and interview",
  other: "Other, see the school's notice",
};

function years(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y} ${y === 1 ? "year" : "years"}`;
  if (y === 0) return `${m} ${m === 1 ? "month" : "months"}`;
  return `${y} ${y === 1 ? "year" : "years"} ${m} ${m === 1 ? "month" : "months"}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateText(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "3 to 4 years as on 31 Mar 2027", or null when the school gave no age rule. */
export function ageRuleText(
  minMonths: number | null | undefined,
  maxMonths: number | null | undefined,
  referenceDate: string | null | undefined,
): string | null {
  if (minMonths == null && maxMonths == null) return null;
  let rule: string;
  if (minMonths != null && maxMonths != null) rule = `${years(minMonths)} to ${years(maxMonths)}`;
  else if (minMonths != null) rule = `${years(minMonths)} minimum`;
  else rule = `${years(maxMonths as number)} maximum`;
  return referenceDate ? `${rule}, as on ${dateText(referenceDate)}` : rule;
}

/** "120 seats, 30 under RTE", "120 seats", or null when unreported. */
export function seatsText(
  total: number | null | undefined,
  rte: number | null | undefined,
): string | null {
  if (total == null && rte == null) return null;
  const parts: string[] = [];
  if (total != null) parts.push(`${total} seats`);
  if (rte != null) parts.push(`${rte} under RTE`);
  return parts.join(", ");
}

/** "1 Oct – 30 Nov 2026"; one-sided dates read "Opens …" or "Closes …". */
export function windowText(
  opensOn: string | null | undefined,
  closesOn: string | null | undefined,
): string | null {
  if (opensOn && closesOn) return `${dateText(opensOn)} to ${dateText(closesOn)}`;
  if (opensOn) return `Opens ${dateText(opensOn)}`;
  if (closesOn) return `Closes ${dateText(closesOn)}`;
  return null;
}

/** "Class 6", "Nursery", "UKG". */
export function classLabel(code: string): string {
  const c = code.replace(/^c/, "");
  return /^\d+$/.test(c) ? `Class ${c}` : c.charAt(0).toUpperCase() + c.slice(1);
}
