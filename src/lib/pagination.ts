/**
 * Numbered pagination with a bounded link count: first two, last two and two
 * either side of the current page. Every page is reachable in a few clicks (the
 * old Previous/Next-only control made page 15 fifteen clicks deep, so crawlers
 * rarely reached the schools listed there).
 */
export function paginationWindow(current: number, total: number): (number | "gap")[] {
  const keep = new Set<number>();
  for (const n of [
    1,
    2,
    total - 1,
    total,
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
  ]) {
    if (n >= 1 && n <= total) keep.add(n);
  }
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - (sorted[i - 1] as number) > 1) out.push("gap");
    out.push(n);
  });
  return out;
}
