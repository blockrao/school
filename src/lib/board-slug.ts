/** Short, stable URL segment for a board hub: /schools/{state}/{city}/{slug}-schools. */
export function boardHubSlug(boardName: string): string {
  const n = boardName.toLowerCase();
  if (n.includes("central board")) return "cbse";
  if (n.includes("indian school certificate") || n.includes("icse")) return "icse";
  if (n.includes("international baccalaureate")) return "ib";
  if (n.includes("cambridge")) return "cambridge";
  if (n.includes("national institute of open")) return "nios";
  return n
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** A board hub is only generated (and sitemapped) with at least this many schools. */
export const BOARD_HUB_MIN_SCHOOLS = 5;

export function parseBoardHubSegment(segment: string): string | null {
  const m = segment.match(/^([a-z0-9-]+)-schools$/);
  return m ? m[1] : null;
}

/** Short display name for titles and headings ("CBSE", "ICSE/ISC"); full name otherwise. */
export function boardShortName(boardName: string): string {
  const slug = boardHubSlug(boardName);
  if (slug === "cbse") return "CBSE";
  if (slug === "icse") return "ICSE/ISC";
  if (slug === "ib") return "IB";
  if (slug === "nios") return "NIOS";
  return boardName;
}
