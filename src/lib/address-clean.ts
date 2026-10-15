/**
 * Address parts come from bulk imports and are sometimes junk ("NA", the
 * school's own name repeated as the street). Hide those rather than show raw
 * import noise on a public page.
 */
const EMPTY_VALUES = new Set([
  "na",
  "n/a",
  "n.a.",
  "nil",
  "none",
  "null",
  "-",
  "--",
  "not available",
]);

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cleanAddressPart(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || EMPTY_VALUES.has(v.toLowerCase())) return null;
  return v;
}

/** A street that is just the school name (plus optionally the city) is not an address. */
export function cleanStreet(
  street: string | null | undefined,
  schoolName: string | null | undefined,
  cityName?: string | null,
): string | null {
  const s = cleanAddressPart(street);
  if (!s) return null;
  const n = norm(s);
  const name = norm(schoolName ?? "");
  const city = norm(cityName ?? "");
  if (
    name &&
    (n === name || (city && n === `${name} ${city}`) || (city && `${n} ${city}` === name))
  ) {
    return null;
  }
  return s;
}
