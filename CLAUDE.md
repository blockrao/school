# SchoolOye — frontend repo rules

India K-12 school discovery and admissions: school graph + claim flow, admissions tracker and
alerts, exams, OpenSeat vacancies, admission help (concierge), light teacher profiles.
Launch order (D-080): **Jaipur live now** → Gurugram pilot by 1 Nov → Delhi nursery hub (content)
→ rest of Haryana after the season. South West Delhi stays built but unlinked. English first;
Hindi city/tracker pages by 15 Nov, school pages only when translated (D-086). Brand: **SchoolOye**.

## Read first
- `docs/decisions.md` — the Decisions Register. **It wins every conflict** with any doc, comment or
  chat. Don't re-decide what it settles; add a new entry instead.
- `docs/spec/README.md` — Developer Spec index: architecture, feature map, known issues, timeline.
  One spec per feature in `docs/spec/`; update the feature's spec in the same PR that changes its
  behaviour.
- `docs/guidelines/` — `seo-geo.md`, `content-and-trust.md`, `design.md`.
- `docs/screen-map.md` — live build tracker. `docs/archive/` is never cited as rules.

## Scope
This repo owns UI, features, user flows, wiring, and everything read-facing on top of the tables:
`api`/`staging` views, grants, RLS for app access, publishing rules, and the `/ops` + `/portal`
write paths. The data session owns table structure until the data repo retires (D-091) — this repo
never alters a table; table changes are requested in `docs/spec/data-requests.md`.
Never assess or comment on data quality outside the publishing-rule views. Never block on data.

Data access contract: `docs/spec/data-and-trust.md`.
- **Public pages read ONLY `api.*` views** (defined in `db/views/*.sql`), server-side, through
  `src/lib/db/public-adapter.ts`, validated by Zod contracts in `src/contracts`. Read-only `api`
  SQL functions are allowed where a view can't serve (D-102).
- **Authenticated noindex pages** (`/my`, `/portal`, `/ops`) may read raw tables through the session
  client under RLS; each such module lists its tables at the top (D-103). *Known gap:*
  `public-adapter.ts` still holds two unused raw sub-queries (`school_identifiers`,
  `field_provenance`) — remove them, don't copy the pattern.
- `staging.*` views are analysis-only (`claude_ro`), never read by the app.
- `pnpm verify:views` fails if `anon` can read a raw table or `staging`, or can't read a granted
  `api.*` view; contract mismatches are reported (fix and move on).

**`db/views/*.sql` vs `supabase/migrations/*.sql`**: view files only ever `CREATE OR REPLACE VIEW`
(or an `api` function under D-102). Every grant, revoke and RLS policy goes in
`supabase/migrations/`, applied with `pnpm db:migrate <file> --confirm`, so it's tracked in
`schema_migrations` — including grants on `api.*` views.

**DB command authority (D-073, D-111)**: in this repo Claude applies non-destructive changes
itself — `CREATE OR REPLACE VIEW` (`pnpm db:views --confirm`), `api` functions, idempotent seed
upserts, `GRANT SELECT` on `api.*` views and RLS on non-personal tables (`pnpm db:migrate <file>
--confirm`). Table DDL (`CREATE TABLE`/`ADD COLUMN`/`CREATE INDEX`) runs in the data session: add
it to `docs/spec/data-requests.md` instead. Destructive
changes — `DROP`, `REVOKE`, `DELETE`, `TRUNCATE`, `ALTER COLUMN TYPE`, RLS policy changes on
personal-data tables (`profiles`, `children`, `consents`, `documents`, etc.) — need the user's
explicit "yes" in chat first: show the exact SQL, then wait. `pnpm verify:views` is always
self-run.

## Stack (do not substitute)
- Next.js 16.3.x, App Router, React 19, TypeScript `strict`, Turbopack, pnpm
- Supabase (Postgres + PostGIS + Auth) via `@supabase/ssr`; types via `pnpm db:types` →
  `src/lib/db/types.ts` (regenerate after any table change)
- Supabase is accessed ONLY from the terminal via credentials in `.env.local` — the app via
  `NEXT_PUBLIC_SUPABASE_URL` + keys, terminal tasks via `DATABASE_URL` (psql or Node + `pg`). Never
  install or run the Supabase CLI. Never configure or use any MCP connection for Supabase. Never
  print, log, or commit credentials. The app never uses the service-role key.
- Tailwind CSS v4 (tokens in `src/app/globals.css`) + shadcn/ui primitives restyled to our tokens
- Zod + Server Actions for all mutations; react-hook-form only where a form needs client state
- MapLibre GL (lazy, client island) for maps; no Google Maps JS
- Biome (lint/format), Vitest (unit), Playwright (e2e + a11y smoke)
- Database: Supabase `ap-south-1` (Mumbai; confirm once in the dashboard); Vercel functions: `bom1`
  (`vercel.json`). Keep them in sync (D-083).
- Next.js 16.x API reference: `AGENTS.md` — prefer it over training knowledge.

## Design (full rules: `docs/guidelines/design.md`)
- `design/*.dc.html` is REFERENCE ONLY. Never import, iframe, or copy markup/inline styles; port to
  Server Components with token utilities. No hex or arbitrary `[...]` values in components.
- Fonts via `next/font/google`: Anek Latin, Anek Devanagari, Mukta (`--font-anek-latin`,
  `--font-anek-devanagari`, `--font-mukta`); Devanagari only on `/hi` routes where possible.
- Margin red (#C8372D) ONLY for deadlines 0–7 days away. Every status colour has a text label.
- Deadline margin states: closing soon (red), open (ink), upcoming (dashed ink), not announced
  (slate, "—"), closed (slate), seats now (ink).
- Freshness line on every fact: "Checked N days ago · <source>". Stale limits by fact type (D-087):
  admissions open/closing 3 days, upcoming/not announced 14, fees per session or 180, contacts 90,
  identity 365. Stale = pencil-yellow marker, bold text, "re-checking" — never hidden.
- Minimum text 14px; body 16px.

## Architecture
- `src/app/[locale]/...` public pages; `[locale]/my/*`, `portal/*`, `ops/*` and the `(auth)` pages are
  dynamic and `noindex`.
- Canonical school URL: `/[locale]/[city]/[slug]-[school_code]`, resolved by `school_code`; a wrong
  slug 308s; the legacy `/[locale]/school/[id]-[slug]` permanently redirects (D-040). Teachers:
  `/[locale]/teacher/[id]-[slug]`. Exams: `/[locale]/exams/[slug]` (no city). District never appears
  in a URL, breadcrumb or label (D-041); there is no `[state]` segment.
- Server Components by default. `"use client"` only for real interactivity (tabs are links).
- Data access only in `src/lib/db/*` server modules (`import "server-only"`). Public pages never
  query Supabase from the browser.
- Caching: route `revalidate` + ISR today. Target: Cache Components with `cacheTag('school:<id>')`,
  `cacheTag('city:<slug>')`; a Supabase DB webhook hits `/api/revalidate` (secret-checked) →
  `revalidateTag`. Deadline countdowns ("Closes in 4 days") are computed server-side in IST
  (`Asia/Kolkata`) and streamed, never baked into a static shell.

## SEO / GEO (full rules: `docs/guidelines/seo-geo.md`)
- One `<h1>`. Visible breadcrumbs (Home → city → locality → school) + `BreadcrumbList` JSON-LD.
- `generateMetadata`: title, description, self canonical with locale, OG image via `next/og`;
  `hi-IN` alternate only when the Hindi page is translated (`hi_ready`).
- School JSON-LD: `School` subtype with `PostalAddress`, `GeoCoordinates`, `identifier` (SchoolOye
  School ID + board affiliation no. — **never the UDISE code**), `url` (school's own site),
  `sameAs`. Never `AggregateRating`/`Review`.
- Fact block near the top in plain server-rendered HTML, each fact with source + checked date.
  Unknown values show "Not yet published", never guessed.
- Index gate (D-114, MVP): render at L1+; index at L2 (name, address + locality/pincode, board, phone or
  website, each sourced). `SITE_INDEXABLE` flips once the Jaipur pilot list is at L2 and CI is green.
- Sitemaps: `sitemap.xml` index → per-city route handlers + `sitemap-site.xml`, indexable URLs only,
  real `lastModified`.
- `robots.ts`: allow search engines and AI crawlers on public routes; disallow `/my`, `/portal`,
  `/ops`, `/api`, `/dev`. Filtered/faceted URLs are handled with canonical + `noindex` meta, not robots.
- `public/llms.txt` + `/[locale]/[city]/[slug]-[code]/index.md` (markdown twin of the fact block).
- *Code not yet matching these rules (fix, don't copy):* `localeAlternates()` always emits `hi-IN`; no `cacheTag` exists yet, so
  `/api/revalidate` is a no-op; `robots.ts` lists 4 AI crawlers (target list in
  `docs/guidelines/seo-geo.md`). Full list: `docs/spec/README.md` → Known issues.

## Performance budget (CI fails over budget)
- `pnpm bundle-check` measures real gzip transfer: total first-load JS (informational; framework
  baseline ~131 KB) and **app-owned JS ≤60 KB gzip on the school page** (the CI gate). See
  `scripts/README.md`.
- LCP ≤2.0 s, INP ≤200 ms on Moto G-class / 4G, CLS ≤0.05.
- No client-side data fetching for first paint. Maps, galleries and the compare tray are lazy islands.

## Trust rules (product law — `docs/guidelines/content-and-trust.md`)
- No paid ranking, no "best" badges for sale, no star ratings, no sold votes.
- Sponsored cards use the sponsored border AND a visible "Sponsored" label. Never just styling.
- No fabricated data, including in seed/demo fixtures shown in production. SchoolOye does not sell
  admissions.
- Elevated access goes through RLS (`is_staff`, `is_school_member`) or scoped Postgres functions.

## Iterative build process
- Build and complete every screen in `design/`; a screen is done only once its states, wiring, e2e
  coverage and screenshots are in place.
- A flow step with no design gets a minimal version from existing `src/components/ui` primitives and
  tokens, marked `// design-pending`, logged in `docs/design-gaps.md`. Never block on a missing design.
- `docs/screen-map.md` is the live tracker (designed+built / built-from-components / pending /
  deferred).
- New files in `design/`: diff against `docs/screen-map.md`, port new components first, replace the
  matching `design-pending` screen and remove its `docs/design-gaps.md` row.

## Working style
- Small PRs, one screen or component per PR. Run `pnpm typecheck && pnpm lint && pnpm test` before
  committing. Update the feature's spec in `docs/spec/` in the same PR when behaviour changes.
- Seed fixtures: real Jaipur (and, from the pilot, Gurugram) schools from public data only.
- Requires `gitleaks` on PATH (`brew install gitleaks`) — the lefthook pre-commit hook runs
  `gitleaks protect --staged` and blocks the commit if it's missing. CI runs the same scanner.
