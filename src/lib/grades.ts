/** "c12" -> "12". Grade codes outside the c<N> pattern (e.g. future nursery/LKG codes) return null rather than a guess. */
function classCodeToLabel(code: string): string | null {
  const match = /^c(\d+)$/.exec(code);
  return match ? match[1] : null;
}

/**
 * Never infers the starting class from the ending one. `min_class` is null for
 * almost every school in the launch dataset today — "Up to Class N" says exactly
 * what's known without implying the school starts at Nursery.
 */
export function formatGradeRange(minClass: string | null, maxClass: string | null): string {
  const max = maxClass ? classCodeToLabel(maxClass) : null;
  if (!max) return "Not yet published";

  const min = minClass ? classCodeToLabel(minClass) : null;
  if (!min) return `Up to Class ${max}`;

  return min === max ? `Class ${min}` : `Class ${min}–${max}`;
}
