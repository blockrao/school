/**
 * The one canonical production origin. Plain module with no server-only import
 * so both `next.config.ts` (runs in plain Node at build time) and
 * `src/lib/env.server.ts` can share it instead of each hard-coding a copy
 * that drifts (next.config.ts used to default to the apex `schooloye.com`
 * while the live site serves at `www.`, and env.server.ts had no production
 * default at all — see the 4 Oct 2026 SEO audit in the commit that added this).
 *
 * `www.` is canonical because Vercel's domain settings redirect the apex to it
 * (D-121 §11); every absolute URL we emit must agree with where requests land.
 */
export const PRODUCTION_ORIGIN = "https://www.schooloye.com";
