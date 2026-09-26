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

## One genuine gap: no generic Exam/Cycle entity yet

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

## Everything else in the frozen baseline

The deferred-items table (full fact-versioning ledger, automated change detection, entity
resolution, data-quality console, generalized notifications, Student Passport as a full
object, teacher marketplace, formal public API) still applies as written in the artifact
linked above — none of it belongs in current scope, and nothing found in this repo
suggests otherwise.
