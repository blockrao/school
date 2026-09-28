# Data access, provenance and publishing rules — Developer Spec

**Status:** approved (describes what is built + the rules new work must follow) · **Updated:** 27 Sep 2026
**Canonical location:** this file (was `docs/DATA_ACCESS.md`). Supersedes the data sections of the
Architecture Foundation and School Directory planning docs.
**Decisions:** N-03, N-10, N-11, N-12, N-14, D-020–D-034, D-072, D-073, D-082, D-090, D-091, D-102, D-103, D-109, D-111

Detailed provenance design (source groups, per-field precedence, review states, freshness,
trust labels, fee reports) lives in `school-entity-page.md` §3 and §5. This file is the
contract every screen and view must obey.

## 1. Ownership

| Work | Owner |
|---|---|
| Table structure, table migrations, extraction and ingestion jobs, crawlers, change monitor | **Data session / data repo** until it retires; then this repo (D-091). New table requests go in `docs/spec/data-requests.md` |
| `api.*` and `staging.*` views, grants, RLS for app access, publishing rules, `/ops` + `/portal` write paths, UI | **This repo** (`blockrao/school`) |
| Running any DB command | Claude Code, from the terminal with `.env.local` credentials. Never the Supabase CLI, never an MCP connection, never the service-role key in the app (N-11) |

**Who applies SQL (D-073, D-111):** Claude Code self-applies non-destructive changes —
`pnpm db:views --confirm` (views) and `pnpm db:migrate <file> --confirm` (grants on `api.*`
views, additive columns/tables/indexes, idempotent seeds). Table DDL (new tables, columns,
indexes) is run by the data session (Claude Code in the data repo); this repo's sessions run
only views, `api` functions, grants, RLS and seeds (D-111, clarifying D-073 vs D-091). Destructive changes (`DROP`,
`REVOKE`, `DELETE`, `TRUNCATE`, `ALTER COLUMN TYPE`, RLS on personal-data tables) need Prav's
explicit "yes" in chat after seeing the exact SQL. `pnpm verify:views` is always self-run.

**Where SQL lives:** `db/views/*.sql` contain only `CREATE OR REPLACE VIEW` (and, per D-102,
read-only `api` SQL functions). Every grant, revoke and policy goes in `supabase/migrations/`
so it is tracked in `schema_migrations`. *Known drift:* `080_public_teachers.sql` and
`090_public_school_rankings.sql` still contain `GRANT` lines; `api.public_exam_admissions`
exists in the database but has no file in `db/views/` (see `exams.md`). Fix both before adding views.

## 2. Reads

### Public pages (anon or signed in) — `api.*` only (N-10)

Server-side only, never from the browser, all through `src/lib/db/public-adapter.ts`
(CI-enforced by `scripts/check-public-adapter-imports.mjs`) and validated against Zod contracts
in `src/contracts`.

| View | File | Publishing rule (see file header for exact SQL) |
|---|---|---|
| `api.public_schools` | `010_public_schools.sql` | Per-field source gate over `field_provenance` (D-022) |
| `api.public_school_admissions` | `020_public_school_admissions.sql` | Only human-approved cycles (D-025) |
| `api.public_seat_status` | `030_public_seat_status.sql` | See `openseat.md` |
| `api.public_areas` | `040_public_areas.sql` | Internal launch gating; district never shown (D-041) |
| `api.public_districts/states/cities/boards` | `045_reference_views.sql` | Reference passthrough |
| `api.public_school_boards` | `046_public_school_boards.sql` | Source-gated affiliations |
| `api.public_localities`, `public_corridors`, `public_locality_neighbors` | `050`–`070` | Reference; neighbours from `locality_neighbors` (D-033) |
| `api.public_teachers` | `080_public_teachers.sql` | Listed, published teachers (see `teachers.md` for a known leak) |
| `api.public_school_rankings` | `090_public_school_rankings.sql` | Editorial pages only, attributed (D-088) |
| `api.public_exam_admissions` | *missing from repo* | See `exams.md` |

Planned (from `school-entity-page.md` §6.2): `api.public_school_fees`,
`api.public_school_sources`, `api.public_school_updates`, `api.public_school_documents`,
and `api.search_schools()` (function, D-102).

### Authenticated owner/staff pages — RLS session reads allowed (D-103)

`/my/*`, `/portal/*` and `/ops/*` are dynamic and `noindex`. Their server modules may read raw
tables through the signed-in session client, relying on RLS (`is_staff()`,
`is_school_member()`, owner policies). Each such module must list the tables it touches in its
header comment. Public pages never do this.

### Staging

`staging.*` views are readable only by `claude_ro`, for analysis and scripts. The app never reads
`staging` in any environment.

## 3. Publishing rules (enforced in view SQL, not React)

> **Current rule (D-119, 28 Sep 2026):** a school is public when `schools.status = 'published'`, and every field is shown as stored. Rules 1–5 below are **suspended**; kept for reference if gating returns.

1. **Source gate (D-022):** a fact is shown only if its provenance traces to a displayable source
   group for that fact type; otherwise the UI shows "Not yet published" (D-049).
2. **Source groups and precedence (D-023):** replace the hard-coded source-id lists in
   `010_public_schools.sql` with the `sources.source_group` + `source_precedence` tables
   (see `school-entity-page.md` §3.2–§3.3). Until that lands, the lists in `010` apply.
3. **UDISE+ (D-082):** directory facts (address, pincode, management, class range, gender,
   established year, website) may show with "Official record · UDISE+" attribution at the lowest
   official rank; phone/email only under the `sources.licence_note` conditions; the UDISE code
   stays internal. *The live view still hides all UDISE fields — change pending.*
4. **Admissions (D-025):** only cycles approved by a person (`verification_status = 'verified'`
   from ops or school). Legacy `verification IN ('ops_verified','school_verified')` is still what
   `020` checks — migrate to the N-03 columns. `closing_soon` is derived in the view in IST, not
   stored (D-050, D-087).
5. **Fees (D-013):** parent aggregates only above the thresholds in `school-entity-page.md` §5.3;
   school-confirmed or official-document fees outrank them; Form VI is never shown publicly.
6. **No personal data** in any `api.*` view. No source names inside stored values (N-12).
7. **Every fact that reaches the UI** carries its source and checked date via `FreshnessLine` /
   `NotYetPublished`. Staleness follows D-087 and is flagged, never hidden (D-026).

## 4. Render and index levels (D-090)

| Level | Requires | Page |
|---|---|---|
| L0 | Listed only | No page (appears in lists) |
| L1 | + address, pincode | Renders "Details being verified", `noindex` |
| L2 | + board, + phone or website (coordinates at pincode/locality precision is enough) | Full page, **indexable** (MVP, D-114) |
| L3 | + a human-verified current-session admissions record (any status, incl. "not announced"); coordinates at pincode/locality precision or better (D-109) | Full page, indexable; the target level for trust and alerts |
| Suppressed | `schools.status` in hidden / closed / opt-out | Minimal notice, `noindex` (closed → 410) |

`schools.status` is used **only** to suppress; it is not a publish flag. Levels are computed in
`staging.schools_with_level` for analysis and from `api.public_schools` fields in the app; the
planned `schools.index_state` column makes the gate explicit (`school-entity-page.md` §11.3).
Government schools follow the same L2 rule (D-114).
Street/rooftop geocode precision is required only for distance features, never for the index gate (D-109).

## 5. Owner-run views (why base-table RLS doesn't hide rows)

`schools` has RLS restricting direct reads to `status = 'published' OR is_staff() OR
is_school_member(id)`. The `api.*` views don't filter on status, so they only work because they
are **owner-run**: created via `DATABASE_URL` (role `postgres`, `rolbypassrls = true`), they run
with the owner's privileges (default view semantics, not `security_invoker`). If a view is ever
re-created by a role without `BYPASSRLS`, the base-table policy silently hides rows again.
Re-verify `select rolbypassrls from pg_roles where rolname = current_user` is `true` whenever
views are applied. (Functions added under D-102 are the exception: `security invoker`, reading
only `api.*` views.)

## 6. Routing (D-040, D-041)

District is internal only — never in a URL, breadcrumb or label. Public routes:

- `src/app/[locale]/[city]/page.tsx` — city (and town) page.
- `src/app/[locale]/[city]/[entitySlug]/page.tsx` — a school (`{slug}-{school_code}`, detected by
  `parseSchoolSlugCode` in `src/lib/school-url.ts`) or a locality slug.
- `src/app/[locale]/[city]/[entitySlug]/index.md/route.ts` — markdown twin.
- `src/app/[locale]/school/[idSlug]/page.tsx` — legacy UUID URL, permanent redirect.
- `src/app/[locale]/exams/[slug]/page.tsx` — exams (no city, D-012).

There is no `[state]` segment any more.

## 7. Verifying the contract

`pnpm verify:views` (read-only):
1. Reads every row of each `api.*` view and parses it against its Zod contract in
   `src/contracts` (drift is reported; fix and move on).
2. `SET ROLE anon`: confirms anon can read every granted `api.*` view and cannot read any raw
   table or `staging.*`.

*Known gap:* the exam contract isn't checked yet (`exams.md`).

## 8. Never

- Query raw tables from public pages (only `api.*`).
- Alter table structure from application code or view files.
- Let `staging` reach the app.
- Show a value without its source and date, or guess an unknown one.
- Treat a competitor aggregator as a source (D-027).
