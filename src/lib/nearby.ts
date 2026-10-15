/**
 * Proximity helpers for the "Nearby schools" block (15 Oct 2026 SEO audit).
 *
 * Why this exists: the block used to fall back to "the first 8 schools in the
 * city by name" when a school had no locality, which is true for every
 * Gurugram school today. Every page then linked to the same four
 * alphabetically-first schools and labelled them "nearby". Internal links
 * should carry real relatedness, so rank by distance from stored coordinates.
 */
export type GeoPoint = { lat: number | null; lng: number | null };

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Nearest `n` candidates to `origin`, excluding the origin id, skipping rows with no coordinates. */
export function rankNearest<T extends GeoPoint & { id: string }>(
  origin: GeoPoint & { id: string },
  candidates: readonly T[],
  n: number,
): T[] {
  if (origin.lat == null || origin.lng == null) return [];
  const from = { lat: origin.lat, lng: origin.lng };
  return candidates
    .filter((c) => c.id !== origin.id && c.lat != null && c.lng != null)
    .map((c) => ({ c, d: haversineKm(from, { lat: c.lat as number, lng: c.lng as number }) }))
    .sort((x, y) => x.d - y.d || x.c.id.localeCompare(y.c.id))
    .slice(0, n)
    .map((x) => x.c);
}
