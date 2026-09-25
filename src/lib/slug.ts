/** "South West Delhi" -> "south-west-delhi". Used where a table has no stored slug column (e.g. states). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
