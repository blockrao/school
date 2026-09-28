/** Plain whitespace word count for a content-length hint — not locale-aware,
 * not exact, just enough to give an editor a rough sense of length against a
 * guideline like "up to 80 words" (docs/guidelines/content-and-trust.md §3). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
