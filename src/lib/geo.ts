/**
 * Best-effort parse of a PostGIS `geography(Point)` column as returned by
 * PostgREST/supabase-js over the raw `schools`/`localities` tables (GeoJSON
 * shape: `{ type: "Point", coordinates: [lng, lat] }`). Returns null on any
 * other shape rather than throwing — a map pin silently not rendering is
 * fine; a page crash is not.
 *
 * Stopgap only: api.public_schools / api.public_localities (db/views/) already
 * compute lat/lng as plain numbers via ST_Y/ST_X. Once those views are applied
 * and src/lib/db/public-adapter.ts reads them directly, this parser goes away.
 */
export function parseGeographyPoint(raw: unknown): { lat: number; lng: number } | null {
  if (raw == null) return null;
  if (
    typeof raw === "object" &&
    raw !== null &&
    "type" in raw &&
    (raw as { type: unknown }).type === "Point" &&
    "coordinates" in raw &&
    Array.isArray((raw as { coordinates: unknown }).coordinates)
  ) {
    const [lng, lat] = (raw as { coordinates: unknown[] }).coordinates;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  return null;
}
