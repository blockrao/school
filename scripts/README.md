# Bundle measurement

`pnpm bundle-check` — builds nothing itself, run `pnpm build` first. Starts `next
start`, drives a real Chromium via Playwright, and sums the actual gzip-compressed
`responseBodySize` of every script request the browser makes. This is the real
network transfer cost, not a sum of `.next/` file sizes (which overcounts — not
every listed chunk is actually requested by a given route).

Fails (exit 1) if any non-baseline route's JS above the framework baseline exceeds
60 KB gzip — the CLAUDE.md performance budget for app-owned JS.

## Framework baseline snapshot (2026-09, Next 16.3.6 / React 19.2.8)

Measured on `/` (zero app-owned client components): **~131 KB gzip** (130.9–134.2 KB
across repeated runs) real network transfer, across exactly 6 JS files.

**Correction to an earlier version of this doc**: it previously listed
`tailwind-merge/src/lib/default-config.ts` (21 KB) as part of this baseline. That was
wrong — it came from running `source-map-explorer` against a glob of *every* chunk in
the build output, which includes `/dev/components`'s chunks (which does use
`tailwind-merge`, extensively, across 23 components). `/` doesn't render anything
that imports `@/lib/utils` or `cn()` — its `page.tsx` is `return null` and its
`layout.tsx` only touches fonts — so nothing pulls `tailwind-merge` into its bundle.
Confirmed two ways: `grep` for `tailwind-merge`/`twMerge`/`extendTailwindMerge`
across the exact 6 files `/` actually downloads (per `measure-bundle.mjs`'s
`perFile` output) returns zero matches; and re-running `source-map-explorer` scoped
to exactly those 6 files (not a glob) shows 100% Next.js/React framework code:

| Module | Uncompressed bytes |
| --- | --- |
| `react-dom/cjs/react-dom-client.production.js` | 200,702 |
| `react-server-dom-turbopack-client.browser.production.js` (RSC client runtime) | 23,167 |
| `next/.../segment-cache/cache.ts` (App Router navigation cache) | 23,009 |
| `next/.../segment-cache/scheduler.ts` | 13,465 |
| `next/.../router-reducer/ppr-navigations.ts` | 10,400 |
| `react/cjs/react.production.js` | 7,793 |
| everything else — more `segment-cache/*`, `router-reducer/*`, `app-router.tsx`, the turbopack runtime | ~28,000 combined |

`next` package code alone is 440,364 of 453,111 total mapped bytes (~97%) for `/`'s
real chunks. Nothing from `node_modules` outside `next` appears at all.

Takeaways:
- The baseline really is ~100% React 19 + Next.js's own client runtime (React DOM,
  RSC streaming client, the App Router's segment cache and router reducer). This is
  the unavoidable cost of the mandated stack, not something we can trim.
- `tailwind-merge` (and every other UI-library dependency) only ships to routes that
  actually render a component using `cn()` — Next's route-level code splitting is
  working correctly here, there's nothing to fix.
- This was measured with zero real product pages built. Once a real page (e.g. a
  school page) exists, rerun `pnpm bundle-check` with that route added to
  `ROUTES` in `measure-bundle.mjs` (`baseline: false`) to get its app-owned delta —
  that route *will* pull in `tailwind-merge` and whatever components it renders, and
  that's the number the 60 KB app-owned budget applies to.

To reproduce a module breakdown yourself: set `productionBrowserSourceMaps: true` in
`next.config.ts`, `pnpm build`, run `pnpm bundle-check` to get the exact file list a
route downloads (its `perFile` output), then run `source-map-explorer` scoped to
*those specific files* — not a glob of the whole `.next/static/chunks/` directory,
which mixes in every other route's chunks too. Revert the sourcemap flag afterward —
sourcemaps aren't served in normal production builds.
