# Bundle measurement

`pnpm bundle-check` — builds nothing itself, run `pnpm build` first. Starts `next
start`, drives a real Chromium via Playwright, and sums the actual gzip-compressed
`responseBodySize` of every script request the browser makes. This is the real
network transfer cost, not a sum of `.next/` file sizes (which overcounts — not
every listed chunk is actually requested by a given route).

Fails (exit 1) if any non-baseline route's JS above the framework baseline exceeds
60 KB gzip — the CLAUDE.md performance budget for app-owned JS.

## Framework baseline snapshot (2026-09, Next 16.3.6 / React 19.2.8)

Measured on `/` (zero app-owned client components): **~131 KB gzip** (130.9–131.0 KB
across repeated runs) real network
transfer. This is over the 130 KB reference point in the budget, so here's the
module-level breakdown, captured via `productionBrowserSourceMaps: true` +
`source-map-explorer '.next/static/chunks/*.js'` (uncompressed source size per
module — compression happens across the whole concatenated bundle, not per module,
so per-module numbers are necessarily uncompressed):

| Module | Uncompressed bytes |
| --- | --- |
| `react-dom/cjs/react-dom-client.production.js` | 200,702 |
| `react-server-dom-turbopack-client.browser.production.js` (RSC client runtime) | 23,167 |
| `next/.../segment-cache/cache.ts` (App Router navigation cache) | 23,009 |
| `tailwind-merge/src/lib/default-config.ts` | 21,376 |
| `next/.../segment-cache/scheduler.ts` | 13,465 |
| `next/.../router-reducer/ppr-navigations.ts` | 10,400 |
| `react/cjs/react.production.js` | 7,793 |
| several more `next/.../segment-cache/*`, `router-reducer/*`, `app-router.tsx` files | ~30,000 combined |
| our own `src/` code | 3,876 |

Takeaways:
- ~90% of the baseline is React 19 + Next.js's own client runtime (React DOM,
  RSC streaming client, the App Router's segment cache and router reducer). This is
  the unavoidable cost of the mandated stack, not something we can trim.
- `tailwind-merge`'s default config (21 KB uncompressed) is the one non-framework
  contributor big enough to matter — it ships Tailwind's full class-group config to
  do conflict resolution in `cn()`. Worth revisiting later (a trimmed config, or a
  lighter merge utility) if the budget gets tight, but not urgent — our own code is
  currently under 4 KB.
- This was measured with zero real product pages built. Once a real page (e.g. a
  school page) exists, rerun `pnpm bundle-check` with that route added to
  `ROUTES` in `measure-bundle.mjs` (`baseline: false`) to get its app-owned delta.

To reproduce the module breakdown yourself: set `productionBrowserSourceMaps: true`
in `next.config.ts`, `pnpm build`, then
`pnpm exec source-map-explorer '.next/static/chunks/*.js' --json`. Revert the config
flag afterward — sourcemaps aren't served in normal production builds.
