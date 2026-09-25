# Data access architecture

## Ownership

- **The data repo** owns table structure and table migrations. It extracts and saves data.
  It never creates views, grants, or RLS policies.
- **This repo** owns everything read-facing on top of those tables: the `api`/`staging`
  schema views, the grants on them, the RLS policies for app access, the publishing rules
  (which facts get shown and why), and the `/ops` staff-review write path.
- Neither repo alters table structure from application code. This repo's migrations
  (`scripts/db-migrate.mjs`, `scripts/db-views.mjs`) only ever create/replace views, grants,
  and policies — never `ALTER TABLE`.

## Production reads

Only these four `api` schema views, via the publishable/anon key, **server-side only**
(never from the browser):

- `api.public_schools`
- `api.public_school_admissions`
- `api.public_seat_status`
- `api.public_cities`

Defined in `db/views/010`–`040_*.sql`, granted to `anon` and `authenticated` in
`db/views/090_grants.sql`. See each file's header comment for its exact publishing rule.

## Publishing rules (enforced in the view definitions, not in application code)

- A fact is shown only if it traces to an **official source** (government/board lists) —
  or, for contact fields (phone/email/website) specifically, a **matched school website**.
  See `db/views/010_public_schools.sql`'s header for the exact source-id lists.
- **UDISE-sourced fields are never shown — including the UDISE code itself.** (Confirmed:
  the code is treated as UDISE-sourced too, not exempted as a "stable identifier".)
- No personal data.
- Admission cycles are shown only once **approved** — `verification IN ('ops_verified',
  'school_verified')`, not merely `source_verified` from an automated extraction.
- Every fact that reaches the UI carries its source and a checked-at date through the trust
  components (`FreshnessLine` / `NotYetPublished`) — never a bare value.

## Completeness levels (drive whether/how a school page renders)

- **L0** — listed only, no dedicated page.
- **L1** — has address + pincode → page renders with "Details being verified", `noindex`.
- **L2** — + phone or website, + coordinates → full page, indexable.
- **L3** — + an approved admission cycle → admissions shown.

Computed in `staging.schools_with_level` (`db/views/100_staging_schools.sql`) for analysis;
the app computes the same thresholds from `api.public_schools`' fields directly (no `staging`
access from the app — see below).

## Dev / staging

`staging.*` views (all schools regardless of status, with the completeness level above) are
readable **only by `claude_ro`**, for analysis and the row-count/level reports in this repo's
`scripts/`. **The Next.js app never reads `staging` in any environment**, including local dev
— dev renders against the same `api.*` views as production, which is why L0/L1 schools are
the normal case to design for, not an edge case.

## Applying view changes

`scripts/db-views.mjs` applies every `db/views/*.sql` file, in filename order, over
`DATABASE_URL`. Each file is idempotent (`create or replace view` / `grant` / `revoke`), so
re-running is always safe. **Refuses to run without `--confirm`** — same human-in-the-loop
gate as `scripts/db-migrate.mjs`: Claude writes the SQL and stops; a human runs
`pnpm db:views --confirm`.

## Verifying the contract

`pnpm verify:views` (read-only, no `--confirm` needed):
1. Selects every row from each `api.*` view and parses it against the matching Zod schema in
   `src/contracts` — fails if a view's actual shape has drifted from the contract the app
   code assumes.
2. `SET ROLE anon` and confirms: `anon` can read all four `api.*` views, and **cannot** read
   any raw table or `staging.*`.

## Never

- Query raw tables directly (`schools`, `source_records`, `field_provenance`, etc.) from
  application code — only the named `api.*` views.
- Alter table structure from this repo, in a view file or anywhere else.
- Let the `staging` schema reach the Next.js app, in any environment.
