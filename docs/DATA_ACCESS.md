# Data access architecture

This repo is the **public website only**. It reads data; it never writes to the database
and never creates migrations. A separate data repo owns the schema, the `api`/`staging`
view contracts, and the ingestion pipeline.

## Production

Reads **only** these `api` schema views, via the publishable/anon key, **server-side only**
(never from the browser):

- `api.public_schools`
- `api.public_school_admissions`
- `api.public_seat_status`
- `api.public_cities`

## Development / staging

Reads the `staging` schema views — all schools including unpublished, with a completeness
level and per-field status — via a server-side connection as role `ui_staging_reader`.

**That credential must never be present in production.** A startup check refuses it when
`NODE_ENV=production` or when running on the production domain. See
`src/lib/env.server.ts` for the check once it's wired.

## Contract

The exact view contract lives in the data repo at `docs/contract/api_views.md`. It's
mirrored here in `src/contracts` as Zod schemas. The build fails if the two diverge —
this repo's schemas must never silently drift from what the data repo actually ships.

**Status:** the data repo hasn't shared the contract content yet, and the `api`/`staging`
views don't exist in the database yet (data repo step 2 in progress). Until then:
- `src/contracts` doesn't exist yet — pending the contract content.
- All screens are built against **fixtures shaped exactly like the contract**, not live
  queries, and not the raw base tables.

## Never

- Query raw tables directly (`schools`, `source_records`, `field_provenance`, etc.) —
  not from production, not from dev/staging. Only the named views above.
- Write to the database, or create/apply migrations, from this repo.

## Rollout plan (once the data repo's views exist)

1. Point dev at the `staging` views. Render real schools across completeness levels
   L0–L3 honestly:
   - L0: listed only, no page
   - L1: page renders with "Details being verified", `noindex`
   - L2: full basic page
   - L3: full page with admissions
   Report how real Delhi and Gurugram schools render, and which fields are most often
   missing.
2. Build, in order: shell → city list/search (board, locality, class, fee, admission
   status filters) → school page → admissions open / closing soon → age checker → alert
   signup (UI only). Every fact goes through the trust components (source + checked
   date, or "Not yet published") — never a bare value.
3. Switch production to the `api` views once they return rows. Add a check that fails
   the build if any page would render a fact without a source and a checked date.
