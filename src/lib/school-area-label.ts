/**
 * Identity projection consistency (Identity Layer Pilot & Closure, item 5,
 * 29 Sep 2026): a school's page title/meta (schoolMetadata), its H1
 * (h1LocationSuffix) and its webPageJsonLd.name must all render the exact
 * same area label — one page-level identity, not three independent
 * implementations of "locality + city" that can silently drift apart.
 *
 * This used to be three separate inline computations in entity-page.tsx. One
 * of them (webPageJsonLd.name) had a real bug: it fell back to a
 * locality-else-city local meant for JSON-LD `address.addressLocality` (which
 * is deliberately either/or — a postal addressLocality is one place name,
 * never a joined string), instead of the locality-AND-city join the title and
 * H1 use. A school with both a real locality and a city therefore got a
 * JSON-LD page name that silently disagreed with its own <title> (e.g.
 * "Sirsi Road — SchoolOye" in JSON-LD vs "Sirsi Road, Jaipur — SchoolOye" in
 * <title>). All three call sites now route through this one function so they
 * can't diverge again without changing shared code.
 *
 * Pulled into its own module (rather than living in entity-page.tsx, which
 * imports server/env-dependent code) so it stays unit-testable in isolation —
 * see school-area-label.test.ts.
 *
 * localityName is only ever real, verified data (SchoolOye's own locality
 * match); never inferred from geocode_precision or invented for a school
 * that's only been pincode-matched to a city.
 */
export function schoolAreaLabel(
  localityName: string | null | undefined,
  cityName: string | null | undefined,
): string {
  return [localityName, cityName].filter(Boolean).join(", ") || "India";
}
