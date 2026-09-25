/**
 * "SOUTH WEST DELHI" -> "South West Delhi". District names are stored all-caps in
 * the source data; this is a display-only transform — slugs and lookups always use
 * the raw stored value, never this.
 */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
