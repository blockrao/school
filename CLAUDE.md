# SchoolOye — frontend repo rules

India K-12 school discovery: school graph + claim flow, OpenSeat vacancies, admission help, teacher profiles.
Launch: Delhi, Gurugram, Haryana. English first, Hindi next (`/hi`).

## Stack (do not substitute)
- Next.js 16.3.x (latest patch), App Router, React 19, TypeScript `strict`, Turbopack, pnpm
- Supabase (Postgres + PostGIS + Auth) via `@supabase/ssr`; types from `supabase gen types` → `src/lib/db/types.ts`
- Tailwind CSS v4 (tokens in `src/app/globals.css`) + shadcn/ui primitives restyled to our tokens
- Zod + Server Actions for all mutations; react-hook-form only where a form needs client state
- MapLibre GL (lazy, client island) for maps; no Google Maps JS
- Biome (lint/format), Vitest (unit), Playwright (e2e + a11y smoke)
- Vercel region `bom1`; Supabase region ap-south-1

## Design source
- `design/*.dc.html` is the Claude Design export — REFERENCE ONLY. Never import, iframe, or copy markup/inline styles.
- Port to Server Components using token utilities (`bg-copy-white`, `text-ink`, `font-display`, `rounded-md`...).
  No hex values or arbitrary `[...]` values in components; add a token if one is missing.
- Route + component map and launch scope: `docs/screen-map.md`. Build only launch-scope screens.
- Fonts via `next/font/google`: Anek Latin (500/600/700), Anek Devanagari (500/600/700), Mukta (400/500/600/700),
  exposed as `--font-anek-latin`, `--font-anek-devanagari`, `--font-mukta`. Load Devanagari only on `/hi` routes where possible.

## Visual rules from the design (enforce in code review)
- Margin red (#C8372D) ONLY for deadlines 0–7 days away. Nothing else is red.
- Every status colour has a text label next to it. Never colour alone.
- Deadline margin states: closing soon (red), open (ink), upcoming (dashed ink), not announced (slate, "—"), closed (slate), seats now (ink).
- Freshness line on every fact: "Checked N days ago · <source>". Over 7 days = stale state (pencil-yellow marker, bold text, "rechecking").
- Minimum text size 14px. Body 16px.

## Architecture
- `src/app/[locale]/...` public pages; `(auth)/my/*`, `portal/*`, `ops/*` are dynamic and `noindex`.
- Canonical entity URLs use persistent IDs: `/school/[id]-[slug]`, `/teacher/[id]-[slug]`. If the slug is wrong, 308 redirect to the correct one.
  Locality/city pages link to entities but are never their canonical URL.
- Server Components by default. `"use client"` only for real interactivity (tabs are links, not client state).
- Data access only in `src/lib/db/*` server modules (`import "server-only"`). Public pages never query Supabase from the browser.
- Caching: Cache Components + `cacheTag('school:<id>')`, `cacheTag('city:<slug>')`. A Supabase DB webhook hits
  `/api/revalidate` (secret-checked) → `revalidateTag`. Pre-render the top N schools with `generateStaticParams`; others render on demand.
- Deadline countdowns ("Closes in 4 days") are computed server-side in IST (`Asia/Kolkata`) and streamed, not baked into the static shell.

## SEO / GEO (required on every indexable page)
- One `<h1>`. Breadcrumbs (state → district → city → locality) as visible nav + `BreadcrumbList` JSON-LD.
- `generateMetadata`: title, description, canonical, `alternates.languages` (en-IN, hi-IN), OG image via `next/og`.
- School pages: JSON-LD `School` subtype (`ElementarySchool`/`HighSchool`/`School`) with `PostalAddress`, `GeoCoordinates`, `identifier` (UDISE/affiliation no.), `url`, `sameAs` (official site).
- Fact block near the top in plain server-rendered HTML: board, affiliation no., grades, established, fee range, admission window, each with source + last-verified date.
  Unknown values show "Not yet published", never guessed.
- Sitemaps: `sitemap.ts` index → per-city child sitemaps (≤50k URLs each) with real `lastModified`.
- `robots.ts`: allow search engines and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) on public routes; disallow `/my`, `/portal`, `/ops`, `/api`, filtered search.
- `public/llms.txt` + `/school/[id]/index.md` route (markdown twin of the fact block).

## Performance budget (CI fails over budget)
- School page: ≤100 KB client JS (gzipped), LCP ≤2.0 s and INP ≤200 ms on Moto G-class / 4G profile, CLS ≤0.05.
- No client-side data fetching for first paint. Maps, galleries and the compare tray are lazy client islands.

## Trust rules (product law)
- No paid ranking, no "best" badges for sale, no star ratings, no sold votes.
- Sponsored cards use the sponsored border AND a visible "Sponsored" label. Never just styling.
- No fabricated data, including in seed/demo fixtures shown in production. SchoolOye does not sell admissions.

## Working style
- Small PRs, one screen or component per PR. Run `pnpm typecheck && pnpm lint && pnpm test` before committing.
- Seed fixtures: real Delhi/Gurugram schools from public data only.
