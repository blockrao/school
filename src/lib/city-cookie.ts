/**
 * Shared between the client (src/lib/city-preference.ts, sets/reads it in the
 * browser) and the server (src/lib/db/public-adapter.ts's getSelectedCityArea,
 * reads it via next/headers `cookies()`). Kept in its own file with no "use
 * client"/"server-only" directive so both sides can import the same constant
 * without crossing a client/server module boundary.
 */
export const CITY_COOKIE_NAME = "sy_city";
