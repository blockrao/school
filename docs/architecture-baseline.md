# Architecture baseline — reconciliation with the frozen strategy doc

**Status:** reconciled 2026-09-26. Full reasoning (three rounds of architecture review):
https://claude.ai/code/artifact/c19a303a-b8c0-46bb-a8b7-1b95d1177a82
(SchoolOye — Data & Technical Architecture Foundation)

That document was written from the product/strategy side without visibility into this
codebase. Read against the actual schema, most of its non-negotiables are already built —
often more precisely than the doc specified. This file records the reconciliation so the
baseline isn't re-litigated in the abstract: it's checked against what's real.

## Already satisfied — no action needed

- **Immutable entity IDs, decoupled from URL/slug.** `/school/[id]-[slug]`,
  `/teacher/[id]-[slug]`; a wrong slug 308s to the correct one. Exactly the baseline's #1
  non-negotiable, already correct.
- **Source/provenance separation.** `field_provenance` + the source-id allowlist in
  `db/views/010_public_schools.sql`'s header does what the baseline's `source_type` enum
  was asking for, at finer granularity (per-field source, not per-row).
- **Verification states beyond binary.** `admission_cycles.verification` already
  distinguishes `source_verified` (automated extraction) from `ops_verified` /
  `school_verified` (human-confirmed) — a real "unknown ≠ verified" model, not the
  simplified 4-state enum the baseline doc proposed. Keep this repo's version; don't
  simplify it to match the doc.
- **Taxonomy/reference tables.** `boards` (with `code`) is already a proper reference
  table with a `public_boards` passthrough view, not free text. Same pattern exists for
  `states`, `districts`, `cities`.
- **Claim workflow.** `school_claims` storage bucket + flow policies + narrowed grants are
  already built — the baseline's `claim_status` non-negotiable, already live.
- **Consent/minor-data separation.** `profiles`, `children`, `consents`, `documents` are
  already named explicitly as the destructive-change-needs-human-approval list in
  `CLAUDE.md`. The baseline doc's "children's data needs its own line" addition
  (Section 13 of the artifact) is already the existing practice here, not a gap.
- **Freshness signal.** `FreshnessLine` / `NotYetPublished` components + "Checked N days
  ago · source" on every fact, already required in `CLAUDE.md`'s SEO/GEO section — matches
  the baseline's "last verified" trust signal.
- **No fabricated data, sponsored labeling, no paid ranking.** Already product law in this
  repo's Trust rules section.
- **Faceted-nav / canonical control.** Locality/city pages link to entities but are never
  their canonical URL — already the discipline the baseline asked for.

## Correction (2026-09-28): the exam entity already exists

The claim below — that exams needed a standalone entity not yet built — was **wrong**,
found by inspecting the live database directly rather than the migration files in this
repo. `db/views/` and `supabase/migrations/` are stale on this point: the tables exist in
the live schema without a matching migration file checked in here.

Live tables, confirmed via direct schema inspection: `exams` (evergreen entity, 3 rows),
`admission_cycles` (referenced via `exam_id` for exam-scoped cycles), `exam_cycle_milestones`
(ordered timeline stages — application window, admit card, exam date, result),
`exam_participating_schools`, `exam_centres`, `exam_fee_tiers`, `exam_reservation_splits`.
This is exactly the `exam` → `exam_cycle` → `entry` shape the frozen baseline asked for.

**Real action item, replacing the one below:** this repo's `db/views/` and
`supabase/migrations/` do not reflect these tables at all — no `CREATE OR REPLACE VIEW`
exists for them, so nothing in `api.*` currently exposes exam data to the app, and
`src/lib/db/public-adapter.ts`'s comment about "joining exams instead of schools" for
`api.public_exam_admissions` has no backing SQL anywhere in this repo. Write the missing
views/grants for the exam tables — this is a views/publishing-rules gap (this repo's job),
not a table-modeling gap (the data repo's job, already done).

<details>
<summary>Original (incorrect) entry, kept for history</summary>

The baseline doc (following the original strategy doc's RMS CET example) calls for exams
as their own evergreen entity — `exam` → `exam_cycle` → `entry` — independent of any one
school: `/exams/rms-cet`, with `RMS CET → 2027-28` as a separate cycle row underneath.

This repo has **`admission_cycles`**, which is school-owned (a school's own admission
window for a class), not a standalone exam entity. There is no `exams` or `exam_cycles`
table for externally-conducted exams (RMS CET, Sainik School, NDA, Navodaya) anywhere in
`supabase/migrations/` or `db/views/` as of this reconciliation. `docs/screen-map.md`
lists an "exam detail page" as a planned screen, so this has been anticipated but not yet
modeled.

**Action before building that screen:** model `exams` (evergreen) and `exam_cycles`
(versioned per year, `exam_id` FK) as their own tables in the data repo before writing
exam content or an exam page against them — not as a special case of
`admission_cycles`, and not as a flat page. This is the one item from the frozen baseline
that still needs building, not just confirming.

</details>

## City/district merge (2026-09-28): `city_id` now backfilled everywhere

Every school row was missing `city_id` outside Jaipur/Gurugram (only 149 of 10,668 rows
had it set) even though `district_id` was populated broadly — `city_id` was effectively
useless as a filter. Per product decision, city and district are being treated as
equivalent "for now": one `cities` row now exists per `districts` row (31 new rows
inserted, `name_en`/`slug` copied straight from the district, `is_launch = false`), and
every school's `city_id` was backfilled from its `district_id` via that 1:1 mapping.
Result: 0 schools now lack a `city_id` (26 Jaipur-pincode rows that had no `district_id`
at all were also fixed — `district_id = 75`, `city_id = 1` — while backfilling this).

This surfaced a latent bug in the process: `schools_city_id_slug_key` is a `(city_id,
slug)` unique constraint, and with `city_id` mostly `NULL` before this, duplicate slugs
within the same district were silently allowed (Postgres treats each `NULL` as distinct).
109 schools had a slug colliding with another school in the same district once a real
`city_id` was assigned — their slugs were disambiguated with a short id suffix
(`-xxxxxxxx`). This isn't a URL break: canonical URLs resolve by `school_code`/id, not by
slug text (`010_public_schools.sql`'s header), so a stale slug elsewhere just 308s.

**Did not implement:** a "City / District" UI label. `src/lib/db/public-adapter.ts`
(`PublicCityArea.districtId`) and `CLAUDE.md` (now deleted, but this was explicit in it)
both treat district as internal-only, never rendered. With every `cities` row now named
identically to the district it was created from (1:1, same `name_en`), `cityName` alone
already reads correctly everywhere ("Jaipur", "Gurugram", "Faridabad", "South West
Delhi") — a "City / District" label would show as a redundant "Jaipur / Jaipur". If a
real distinction is wanted later (e.g. Jaipur district's Chomu/Kotputli/Bassi towns vs.
Jaipur city proper — `public_schools.locality_is_town` already flags this at the
locality level), that's a locality/town-page concern, not a reason to duplicate the
district name next to the city name on every page.

## Everything else in the frozen baseline

The deferred-items table (full fact-versioning ledger, automated change detection, entity
resolution, data-quality console, generalized notifications, Student Passport as a full
object, teacher marketplace, formal public API) still applies as written in the artifact
linked above — none of it belongs in current scope, and nothing found in this repo
suggests otherwise.
