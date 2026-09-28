# Implementation log

Running, append-only record of what's actually been built, investigated, decided, and found —
kept so a future user guide and troubleshooting guide can be written from real history instead of
reconstructed from memory or stale docs. Each entry: what happened, what it touches, and anything
a future troubleshooter would want to know. Newest entries at the bottom.

Related durable docs:
- `docs/spec/school-entity-page-v2-design.html` — target design (source of truth for v2 look/feel).
- `docs/spec/school-entity-page-v2-roadmap.md` — phased plan (superseded in its Phase 0/2/5 schema
  assumptions by the live-schema reconciliation below — read this log for the correction before
  trusting that doc's schema claims).
- `docs/ops/2026-09-28-about-en-cleanup.md` — the about_en data cleanup audit trail.

## 2026-09-28 — Increment 1: record badge

Extracted `src/lib/record-badge.ts` (`recordBadge(claim, verification, verifiedAt)`), replacing an
inline function in `entity-page.tsx` that only checked `verification`. Badge now correctly requires
**both** `claim === 'claimed'` AND `verification === 'school_verified'` for "Official record" —
`claim`/`verification` are independent DB enum columns, not coupled. Uses `istDateLabel()` (was
incorrectly using server-local-timezone `toLocaleDateString`). 8 unit tests in
`src/lib/record-badge.test.ts`. Commits `ac3fe4c`, `fd673a8`.

## 2026-09-28 — Increment 2: About-section heading attribution

`entity-page.tsx`'s About section now headed "From the school" (claimed) vs "About this school"
(unclaimed), per spec §7.2 item 7 — previously always said "About {name}" regardless of who
actually wrote the text. Commit `d92761e`.

## 2026-09-28 — `about_en` data-quality cleanup

Audited all 33 published `about_en` values; found the field had become a dumping ground for
research/ops/dedup notes because (a) the content guideline was never surfaced at the editing point
and (b) no dedicated internal-notes column exists anywhere on `schools`. 12 rows nulled, 12
rewritten (Prav's exact approved text), 9 left alone. Full per-row audit trail:
`docs/ops/2026-09-28-about-en-cleanup.md`. Commit `202d3a1`.

**Surfaced a real architecture question** (see the two entries below): where should internal
research/ops notes live if not in `about_en`? Investigated, decided, still not built (see 3B entry).

## 2026-09-28 — Increment 3A: ops `about_en` editor guardrail

Added `src/lib/word-count.ts` + `src/components/ui/word-counted-textarea.tsx`; wired into
`src/app/ops/schools/[id]/page.tsx`'s `about_en` field with an inline hint (80-word limit, no
promotional language) — informational only, doesn't block saving. `about_hi` left untouched
(out of scope). Commit `61c93f3`.

## 2026-09-28 — Increment 3B: internal research-notes architecture (decision only, not built)

Investigated where internal research/QA/dedup notes should live. Ruled out `ops_tasks`,
`data_quality_flags`, `about_en`, and a single mutable `schools.internal_notes` column. **Locked
direction** (not yet built): a first-class, school-level, append-only, staff-only record,
structurally adjacent to (sibling of) `field_provenance` — not a generic catch-all. Open question,
not yet resolved: where the line falls between a context note ("investigate whether these are the
same campus") and a resolution/decision ("confirmed same campus as record XYZ") — the latter may
belong in an entity-resolution record instead of a notes table. **Do not build until this is
resolved** — not urgent, no schema exists yet, nothing depends on it.

## 2026-09-28 — Entity-resolution / dedup workflow investigation (read-only)

Found: dedup matching (UDISE → board affiliation → fuzzy name+pincode+distance) is spec'd
(`docs/decisions.md` D-030, since retired) but not implemented — the fuzzy-match SQL functions
(`fuzzy_candidates_in_districts`, `saras_fuzzy_candidates`) exist but are called from nowhere in
`src/`. `schools.merged_into` and `school_slug_redirects` are the only real merge-lineage schema,
both bare pointers with no actor/timestamp/reason beyond a coarse enum. **No entity-level
decision/resolution record exists anywhere in the schema** — the closest analog,
`field_provenance.verified_by/verified_at`, is 0% filled in 85k live rows (see next entry) and is
field-scoped, not entity-scoped. This directly informed the 3B open question above: there's nothing
existing to align the notes-vs-decision boundary against.

## 2026-09-28 — `docs/decisions.md` retired

Removed per Prav's instruction (stale, superseded by live implementation + current spec). Still
recoverable from git history (pre-removal commit `61c93f3`) if ever needed. Commit `911910b`.

## 2026-09-28 — v2 design adopted as target; roadmap drafted (Phase 0/2/5 schema assumptions later corrected — see below)

Saved `docs/spec/school-entity-page-v2-design.html` (a much more detailed design than the
repo's pre-existing `design/*.dc.html` mockups — three data-completeness states, per-fact
provenance chips, fee-disagreement handling). Wrote `docs/spec/school-entity-page-v2-roadmap.md`,
an 8-phase sequencing plan. **The roadmap's Phase 0 (`school_notices` table) and its "Phase 2/5
need new schema" framing were wrong** — see the live-schema reconciliation below, done before any
of that schema work started. No migration was ever run against the wrong plan.

**Also resolved**, not superseded: the fee "school-provided vs. parent-reported" architecture
conflict (repo's old D3/D-013 vs. Prav's stated preference) — the v2 design's own answer is to show
both when they disagree, choose neither as canonical, and label plainly. Prav confirmed: **D3/D-013
→ superseded by the v2 fee-disagreement design.** Fees implementation itself remains deferred.

## 2026-09-28 — Live-schema reconciliation (capability matrix)

Full live-schema audit (`ybevzpryuvgxclkhdjld`, via direct SQL, not just migration-file grep —
the migration-file-only approach had already caused two missed findings this session, see below)
found that most of what the roadmap assumed was "missing schema" already exists, built and
RLS-wired, just largely empty of data:

- `admission_notices` (276 rows) — full school-member-submits → staff-reviews → `promoted_to_golden`
  pipeline. This **is** the "school submits an update" mechanism Phase 0 was going to build fresh.
- `admission_cycles` (10 rows) — already has `documents_required text[]`, `dob_from/dob_to` — the
  age-checker and documents-checklist modules need zero new schema, only UI.
- `seat_status` (0 rows) — same member-submits/staff-confirms shape, already wired.
- `school_posts` (added by a migration dated 2026-09-26, easy to miss by only grepping the
  baseline) — write + staff review for school-authored news/PR already done; the migration's own
  comment says public display is "a follow-up." That's the real Phase 5 gap — not a new subsystem.
- `field_provenance` (85,068 rows, checked live) — 19 distinct fields, all scoped to
  `entity_table='schools'` only; `verified_by`/`verified_at` are **0% filled across all 85k rows** —
  it's a pure ingestion-source log, never used as a review/decision mechanism in practice.
  `licence_class` (`open`/`internal`) exists on the live table but is **not present in any migration
  file** — confirmed schema drift (a column added directly against the live DB, never migrated) —
  flagged, not yet acted on.
- `fee_items` (0 rows) — confirmed **staff-write only, no member-insert policy** — unlike every
  sibling table above, there is genuinely no school-side fee-submission path today. Real, specific,
  recorded gap; not building it now (Fees stays deferred).
- No table anywhere for board-results-by-year, safety certificates with expiry, or staff/teacher
  count aggregates — these remain genuinely missing.
- No reviews/ratings/parent-voice table or parent-identity-verification mechanism anywhere —
  the one module with no existing analog to build from at all.

**Locked as a result:** provenance stays a **shared UI display convention** reading each domain
table's own existing verification/review column — not a `field_provenance` redesign, not a new
generic table. School-submitted updates use **purpose-built domain tables** (the pattern already in
use) — not a generic `school_notices` table. Admissions and News get **zero new schema** — the gap
is UI/integration only.

**Process note for troubleshooting:** two separate investigations this session initially
under-reported what exists, because they searched `supabase/migrations/00000000000000_baseline.sql`
plus grep rather than querying the live database directly or reading every dated migration file.
Anyone auditing schema in this repo going forward should query `ybevzpryuvgxclkhdjld` directly
(`list_tables`/`execute_sql`) rather than trusting a baseline-file grep — migrations dated after the
baseline (e.g. `20260926092026_school_posts_news_and_pr.sql`) are easy to miss that way.

## 2026-09-28 — Claim-flow state-machine review (in progress — investigation only so far, no code written yet)

**Correction to an earlier claim in this same session:** the capability matrix said the "Claim this
page" button is "a dead-end today." That was wrong — it was based on a sub-agent check that never
looked at the `/for-schools/claim` route tree. The actual flow is substantially built:

- `src/app/for-schools/claim/page.tsx` — search-by-name to find your school.
- `src/app/for-schools/claim/[schoolId]/page.tsx` — claim form, 3 methods (official email / phone
  on record / letterhead upload), redirects away immediately if `school.claim === 'claimed'`.
- `src/app/for-schools/claim/[schoolId]/actions.ts` (`submitClaim`) — requires auth (redirects to
  sign-in if anonymous), matches typed email/phone against what's on record (informational only,
  doesn't gate the claim — staff make the real call), inserts into `school_claims`
  (`status` defaults to `pending`), redirects to a pending-confirmation page.
- `src/app/ops/claims/page.tsx` + `actions.ts` — staff review queue; `approveClaim` sets
  `school_claims.status='claimed'`, inserts a `school_members` row (`role: 'admin'`), and sets
  `schools.claim='claimed'`; `rejectClaim` sets `status='rejected'`.
- `entity-page.tsx`'s "Is this your school? Claim it free" link is **already conditional** on
  `school.claim !== "claimed"` — it already hides itself once claimed.

**Confirmed bug, found during this review, sitewide (not claim-specific):** every `redirect("/sign-in?next=...")` call site in the app (`for-schools/claim/[schoolId]/actions.ts`,
`ops/orders/actions.ts` + `page.tsx`, `portal/edit-request/actions.ts`, `auth/callback/route.ts`'s
error path) targets bare `/sign-in`, but the real sign-in page only exists at
`src/app/[locale]/(auth)/sign-in/page.tsx` (i.e. `/en/sign-in`). There is no middleware or root
route rewriting an unprefixed path to a locale — confirmed by reading
`src/app/[locale]/layout.tsx`, which explicitly `notFound()`s any locale not in `["en", "hi"]`.
**So `/sign-in` 404s.** An anonymous visitor trying to submit a claim today hits this 404 partway
through — the claim form itself works, but the auth handoff breaks the flow for anyone not already
signed in. This is the single highest-leverage fix found so far, and it's shared plumbing, not
claim-only.

**State-machine findings, confirmed by reading the actual code (not the docs):**
- **A. Anonymous → claim:** form renders fine (page-level check is only `claim==='claimed'`, no
  auth check at render). Breaks on submit — see the `/sign-in` bug above.
- **B. Logged-in user → claim:** works — inserts into `school_claims`, redirects to pending page.
- **C. Already-submitted claim → claim again:** **no protection.** No unique constraint on
  `school_claims(school_id, user_id)`, no pending-claim check in the page. A user (or two different
  users) can submit multiple pending claims for the same school.
- **D. Claim pending → what does the user see if they come back later?** Nothing indicates a claim
  is in progress — `schools.claim` is never set to an intermediate "pending" value (only
  `'unclaimed'` or `'claimed'` are ever written by this flow), so revisiting the claim URL shows the
  same blank claim form again, with no "you already have a claim in review" messaging.
- **E. Approved → becomes member:** confirmed correct — `school_members` insert +
  `schools.claim='claimed'`, and the entity page's claim CTA correctly disappears afterward.
- **F. Rejected → resubmit:** allowed (nothing blocks it), but **no messaging tells the user their
  claim was rejected** — they'd just see the same blank form again.
- **G. Already a member → CTA becomes "Manage school"?** Partially: the "Claim it free" link already
  hides once `claim==='claimed'`, but there's no "Manage school" link put in its place — a claimed
  school's admin has no obvious next step from the public page.
- **H. Two people claim the same unclaimed school:** schema allows it (no uniqueness constraint on
  `school_members(school_id, user_id)` prevents multiple different admins per school — composite PK
  is `(school_id, user_id)`, so this may be intentional multi-admin support, not a bug) — but
  combined with finding C, staff could unknowingly approve two independent claims from two strangers
  before either party is aware of the other. No safeguard surfaces this to staff in the ops queue.

**Not yet done:** no code written for Increment 4 yet — this section is the investigation Prav asked
for, reported back before implementation starts, per the deferred-review discipline this whole
session has followed.

## 2026-09-28 — CORRECTION: the "/sign-in redirect is broken" finding above is false

The claim-flow review above reported a "confirmed bug": every `redirect("/sign-in?next=...")` call
site targets a route that supposedly doesn't exist outside `/en/sign-in`, with no middleware to
rewrite it. **That conclusion was reached by searching for a file named `middleware.ts`, which does
not exist in this repo — but the mechanism does, under a different name.** This repo runs Next.js 16,
which renamed the middleware convention to `proxy.ts` (confirmed against
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, and
`node_modules/next/AGENTS.md` states this explicitly). `src/proxy.ts` exists, implements exactly
this rewrite, and `"sign-in"` is explicitly listed in its `LOCALE_ROOTS` set — so a request to
`/sign-in` is correctly, silently, server-side-rewritten to `/en/sign-in` on every request. **There
is no bug. The `/sign-in` redirect used by the claim flow, `ops/orders`, `portal/edit-request`, and
`auth/callback` all work correctly as written.**

Root cause of the wrong finding, stated plainly because it's the third time this exact failure mode
has hit this session (see the live-schema reconciliation entry above for the first two): checking
for a familiar convention name instead of verifying against what this specific, intentionally-
modified codebase actually does. The repo's own root `AGENTS.md` says as much on every session start
("This is NOT the Next.js you know... breaking changes... read `node_modules/next/dist/docs/`
before writing any code") — this is the first time that instruction was actually followed, and it
immediately overturned a conclusion already reported to Prav as "confirmed." Going forward: before
declaring any routing/framework-conventions finding, check `node_modules/next/AGENTS.md` and the
relevant `dist/docs/` page first, not general Next.js knowledge.

**Practical effect:** Increment 4 no longer includes an auth-redirect fix — there's nothing to fix.
It is claim-flow completion only (states C, D, F, G from the review above).

## 2026-09-28 — Increment 4: claim-flow completion (A–D)

Implemented Prav's final locked scope — exactly four items, no schema/migration/RLS/auth work:

- **A. Duplicate pending claim.** `submitClaim` (`.../claim/[schoolId]/actions.ts`) now checks for an
  existing `school_claims` row with `status='pending'` for that `(school_id, user_id)` pair *before*
  any file upload, and redirects straight to the pending page if one exists. No new DB constraint —
  `school_id` alone isn't unique (legitimate co-administrators via `school_members`' composite PK),
  so this stays an application-level check, not a schema change.
- **B. Pending-state visibility on revisit.** `ClaimSchoolPage` now reads the latest `school_claims`
  row for the signed-in user server-side (safe here — this page is already dynamic/per-user, unlike
  the public entity page) and redirects to the pending page if `status='pending'`, instead of
  silently re-showing a blank form.
- **C. Rejected → resubmit.** Same lookup: if the latest claim is `status='rejected'`, the page
  renders normally (resubmission was never blocked) but now shows a banner — "Your earlier claim
  wasn't approved... you can submit a new claim below" — instead of silently repeating the form with
  no acknowledgment of the prior rejection.
- **D. Existing-member "Manage school" CTA.** New client component `src/components/claim-status-link.tsx`
  replaces the old unconditional "Is this your school? Claim it free" link on the public entity page.
  Resolves state client-side, after first paint (same pattern as `AuthStatusLink`) — the entity page
  is statically rendered/ISR'd, so a server-side session read here would force the whole page
  dynamic. Renders one of: "Manage school" (→ `/portal`, for confirmed `school_members`), "Claim
  pending", "Claim again" (rejected), or the original CTA — nothing for a signed-out visitor beyond
  one `getSession()` call.

**Verification performed:**
- `pnpm run typecheck` — clean.
- `pnpm run lint` — one import-order fix needed (`@/lib/db/public-adapter` must sort before
  `@/lib/db/session`; Biome's `assist/source/organizeImports` isn't auto-fixed by `format --write`),
  then clean (273 files checked).
- `pnpm test` — all 97 existing tests pass (no new unit tests added — this repo has no
  Supabase-mocking test infrastructure, confirmed by grep; inventing one for this increment would
  have been scope creep, so DB-dependent logic was verified live instead, below).
- **Live-SQL verification (reversible, using a temporary test row, deleted afterward — no residue
  left in the production DB):**
  - Inserted a temporary `school_claims` row (`status='pending'`) for the existing test user against
    an unclaimed school. Confirmed the exact query shape used in `submitClaim` (item A) finds it,
    and that a *different* user querying the same school correctly finds nothing — multi-admin /
    second-claimant capability is preserved, exactly as Prav required.
  - Confirmed the exact query shape used in `ClaimSchoolPage` (item B) returns `status: 'pending'`
    for that row.
  - Updated the row to `status='rejected'`; confirmed the same lookup now returns `status:
    'rejected'` (item C), and confirmed the duplicate-pending check (item A) no longer blocks this
    user — resubmission after rejection works.
  - Deleted the temporary row. Confirmed zero residual test rows remain for that school.
  - **Item D query-cost inspection (explicitly requested by Prav — "don't assume the queries are
    cheap merely because RLS permits them"):** ran `EXPLAIN (ANALYZE, BUFFERS)` on both queries
    `ClaimStatusLink` issues.
    - `school_members` membership lookup: **Index Only Scan** on `school_members_pkey`
      `(school_id, user_id)` — exact composite-PK match, 0 heap fetches, ~2ms. Cheap, as expected.
    - `school_claims` status lookup: **Seq Scan** — this table has no index beyond its own `id`
      primary key (only `school_claims_pkey` exists; confirmed via `pg_indexes`). Not a concern
      *today*: the table holds only 2 rows total in production, so the scan cost is negligible
      (~1ms). Flagged here as a forward-looking note for whoever picks up fees/admissions-scale work
      later — if `school_claims` grows substantially, add an index on `(school_id, user_id)` (or a
      partial index on `status='pending'`) before this becomes a real query. **Not done in this
      increment** — no schema change was in scope.
    - Confirmed via a real query that the one existing `claimed` row correctly joins to its
      `school_members` row (same `school_id`/`user_id`) — the 'member' branch resolves correctly.
    - This component renders once per page (the entity page's own CTA, not reused in any
      listing/card), so there's no N+1 pattern to worry about regardless.
- Browser-level test: still environmentally blocked in this sandbox (egress proxy blocks the
  Supabase host from a real browser session) — recorded as an accepted limitation, per the
  verification hierarchy established earlier this session; live-SQL verification substitutes for it
  here as it did for items A/B/C.

**Files touched:** `src/app/for-schools/claim/[schoolId]/actions.ts`,
`src/app/for-schools/claim/[schoolId]/page.tsx`, `src/components/claim-status-link.tsx` (new),
`src/app/[locale]/_views/entity-page.tsx`, `src/lib/db/browser.ts` (doc-comment update only — this
client now has a third caller beyond `/my`/`/portal`/`/ops`).

**Explicitly not touched, per Prav's scope lock:** no schema change, no migration, no new RLS
policy, no auth/`/sign-in` work (already confirmed working — see the correction entry above).

## 2026-09-28 — Increment 4: LOCKED

Prav reviewed the diff (`914614f`) and verification results and locked the increment as complete,
subject only to a normal browser smoke check of item D's CTA transition (see caution below) — not a
blocker to the lock itself. His review specifically called out that this increment validated a
standing architectural principle for SchoolOye: reuse the existing domain model (`school_claims`'
own lifecycle) rather than inventing new state (a `claim_pending` column, a new status table, a
generic workflow engine) merely to make the UI easier to build. No new state was introduced.

**Recorded as debt, not acted on:** the `school_claims(school_id, user_id)` lookup is a sequential
scan (no index beyond the table's own `id` PK — see the EXPLAIN ANALYZE findings above). Cheap today
at ~2 rows; explicitly *not* worth indexing now — Prav's own words: "Do not add an index now just
because EXPLAIN says seq scan. That's premature optimization at this scale." Revisit when claim
volume becomes material.

**Outstanding, not yet performed:** real-browser smoke test of `ClaimStatusLink`'s hydration
transition (`Claim it free` → session resolves → `Manage school` / `Claim pending` / `Claim again`),
to check for a visible flicker for signed-in visitors. Still blocked in this sandbox (egress proxy
blocks the Supabase host from a real browser render) — the same limitation recorded for this
increment's other browser-level checks above. Analysis without a live render: a flicker, if any,
only affects signed-in visitors on this page (the default state already matches what a signed-out
visitor should see, so there's nothing to swap for the common case). If Prav's own browser check
shows a visible flicker, the fix stays inside `ClaimStatusLink` (e.g. hold a neutral/skeleton state
until `getSession()` resolves) — not a change to the entity page's static/ISR rendering.

**Next increment:** per Prav's direction, work moves back to the public school entity page —
Decision Strip + public page shell (v2 design, roadmap Phase 1) — rather than further claim
infrastructure.

## 2026-09-28 — Increment 5 scoping: live inventory before code

Before writing anything, checked the actual live schema/data behind the six decision-strip slots
(design C4–C5) and the identity-band photo slot (C1–C3), per Prav's requirement to inspect
`school_media.kind` and `fee_items` semantics before wiring either.

**What's actually there, confirmed against the live DB (not migration files or the roadmap doc):**
- `fee_items` and `school_media` both have **zero rows in production** — not "sparse", genuinely
  empty. No `CHECK` constraint on `kind` (`school_media`) or `component` (`fee_items`) either — both
  are free-text with no established taxonomy anywhere: no code writes to either table, no column
  comment, nothing in any migration. So "inspect actual `kind`/component values" has nothing to
  inspect yet — this isn't a shortcut, there's genuinely no convention to discover.
- **More consequential finding:** this codebase enforces, via a CI script
  (`scripts/check-public-adapter-imports.mjs`) and `public-adapter.ts`'s own header comment, that
  *every* public read goes through a curated `api.*` view — no raw-table reads, no exceptions
  (`school_identifiers`/`field_provenance` are the existing precedent: no view yet → the adapter
  function returns empty and says so in a comment, rather than reading the raw table). **Neither
  `fee_items` nor `school_media` has an `api.*` view.** Building either query this increment would
  mean adding a new view (schema-adjacent, explicitly out of scope) or breaking an established,
  CI-enforced convention. Neither is acceptable inside the locked scope, so — independent of the
  "no live rows" finding above — the fee and photo slots have no honest way to be wired to real data
  this increment regardless of what Prav's fee-semantics guardrail question turns up.
- **`admission_cycles` currently has 10 rows, all with `school_id = NULL`** (they carry `exam_id`
  instead — entrance-exam cycles, not school-specific ones). `api.public_school_admissions` (the
  view the existing admissions pill already reads) joins on `ac.school_id = s.id`, so it returns
  zero rows for every school today. Not a new problem introduced by this increment — the page's
  existing deadline pill already reflects this — but means the Admissions slot, while correctly
  wired to real infrastructure, will show "Not yet verified" for every real school in production
  right now, same as Fee/Ratio/Board result, until a school-linked cycle actually exists.
  - Minor, related note found in passing: `admission_cycles` already carries the richer
    provenance-v2 columns (`source_type`, `verification_status`, `last_checked_at`, `verified_at`,
    `verified_by`) live in production, with no migration file for them found locally — `fee_items`
    only has the older `verification` enum. This reconfirms what was locked earlier this session:
    provenance is genuinely domain-specific (each table gets whatever shape its own work landed),
    not a shared table — and means the stale roadmap's Phase 0 ("extend `field_provenance`") isn't
    just outdated, it's solving a problem admissions has already outgrown on its own.
  - Minor hygiene note, not blocking: `fee_items`/`school_media` grants to `anon`/`authenticated`
    include `INSERT`/`UPDATE`/`DELETE` (broader than `school_claims` had before its narrowing
    migration) — but RLS policies (`fees_staff_write`/`media_staff_write`, gated on `is_staff()`)
    correctly block any actual write, so this isn't a live hole, just untidy compared to the
    grants-narrowing pattern already applied to `school_claims`. Flagged for a future cleanup pass,
    not acted on here (no schema/grants change in this increment's scope).
- Confirmed genuinely ready with real, non-empty data: `Location` and `Entry classes`, both already
  sourced from `api.public_schools` (10,668 rows) — the same view the rest of this page already
  reads.

**Net effect on scope (a narrowing, not an expansion — Prav's "no new schema" already implied this,
this is just the concrete reason why):** the six-slot strip ships with 2 of 6 slots
(`Location`, `Entry classes`) genuinely able to show real data today, and 4 slots
(`Admissions`, `Annual fee`, `Student–teacher ratio`, `Board result`) rendering an honest "Not yet
verified" — 3 of those 4 for lack of any table at all or (fees) lack of a readable view, and
`Admissions` specifically because the one view that exists has no school-linked rows yet. The photo
slot renders its sparse "no photo yet" placeholder unconditionally this increment, with no query
against `school_media` at all — documented as a TODO for whenever `api.public_school_media` (or
similar) exists.

## 2026-09-28 — Increment 5: Identity Band + Decision Strip

Implemented on the corrected scope above.

**Built:**
- `src/lib/identity-band.ts` — `identityBand(claim, verification)`, the three-state banner (design
  C1–C3), built entirely from the same two columns `recordBadge` already reads. No new field.
  `claim_status` is a 4-value enum at the type level (unclaimed/pending/claimed/rejected) but
  `schools.claim` itself only ever holds `unclaimed` or `claimed` in practice (confirmed against
  live data — every one of the 10,668 rows is one of those two; `pending`/`rejected` only ever live
  on `school_claims.status`) — anything not exactly `'claimed'` is treated as unclaimed, matching
  `recordBadge`'s own defensive style.
- `src/lib/decision-strip.ts` — `buildDecisionStrip()` plus one builder per slot
  (`buildAdmissionsSlot`, `buildEntryClassesSlot`, `buildLocationSlot`, `unsupportedSlot`). This is
  the architectural piece Prav explicitly locked: **the strip is a presentation layer over existing
  domain facts, not a new data model** — `domain data → normalized display value/status →
  DecisionSlot`. Each builder owns its own source table's shape and trust semantics; the rendering
  component (`src/components/ui/decision-strip.tsx`) only ever sees the normalized `DecisionSlot`
  shape and has no idea which table, or whether any table, backed a given slot. Keeps the component
  reusable later (comparison mode, roadmap Phase 7) without re-deriving verification rules per slot
  per caller.
- `src/components/ui/decision-strip.tsx` — purely presentational, six-cell grid, renders whatever
  `buildDecisionStrip()` hands it.
- Reused `src/components/ui/photo-placeholder.tsx` (already existed, built for teacher pages) for
  the campus-photo sparse state instead of writing a new one.
- Wired into `entity-page.tsx`: identity banner + photo placeholder above the existing header block
  (kept the existing Increment-1 `recordBadge` chip in the action row as-is — this is an addition
  per the design, not a replacement of already-locked work), and the decision strip as a new "At a
  glance" section between the header and the existing two-column content grid.

**Verification performed:**
- `pnpm run typecheck` — clean. `pnpm run lint` — one import-order fix (`@/lib/decision-strip` sorts
  after `@/lib/deadline`, same Biome `assist/source/organizeImports` rule as Increment 4), then
  clean (277 files). `pnpm test` — **111/111 pass** (97 existing + 14 new for
  `src/lib/decision-strip.test.ts`, covering every builder's available/unverified branches, the
  fixed six-slot order, and that fee/ratio/board-result stay unverified even when every other input
  is fully populated).
- **Real-data verification against all four requested scenarios**, against live production rows —
  reported honestly rather than manufactured:
  - **Unclaimed, sparse school** (St. Xavier's Senior Secondary School, C-Scheme): `claim=unclaimed`
    → identity band "Unclaimed"; `min_class`/`max_class` null → Entry classes unverified; no
    school-linked admission cycle → Admissions unverified; `locality_name`/`address` present →
    Location available. Matches expected output exactly.
  - **Claimed school** (R.K. International School, the one real claimed row in production):
    `claim=claimed`, `verification=unverified` → identity band correctly resolves to
    "School-claimed" (not "Verified · school-managed" — confirms the two-column check works on a
    real row, not just the unit tests' synthetic ones). Same sparse pattern otherwise.
  - **A school with real grade data** (Gyan Deep Sr.sec. and others, `min_class='c1'`,
    `max_class='c12'`): confirms `buildEntryClassesSlot`'s "available" branch fires on real values
    (`formatGradeRange` → "Class 1–12"), not just in the unit tests.
  - **"Fully populated" and "verified" school:** **no such row exists in production** —
    `verification='school_verified'` has zero rows, and no `admission_cycles` row has a `school_id`
    at all. Stated plainly rather than papered over: these two branches are verified by the 14 unit
    tests' synthetic inputs only, because the product genuinely has no real example of either state
    yet. This is a fact about the current dataset, not a gap in this increment's testing.
  - Confirmed no misleading "verified" language appears anywhere for an unsupported slot —
    `unsupportedSlot` always renders the literal string "Not yet verified", and the "School-claimed"
    identity state says "verification in progress", never "verified".
- **Not yet done:** browser smoke test of the header/strip at mobile and desktop widths — still
  blocked in this sandbox (egress proxy blocks the Supabase host from a real browser render), same
  accepted limitation recorded for Increments 4/5's other browser-level checks. Everything else on
  Prav's required-verification list is complete.

**Explicitly not touched, per Prav's scope lock:** no coverage card, no updates timeline, no
admissions/fees redesign, no provenance architecture change, no new ratio/result tables, no
`field_provenance` change, no schema of any kind.

## 2026-09-28 — Increment 5: LOCKED

Prav reviewed the diff (`9de46f6`) and locked it as "Canonical Entity Page Foundation." His review
specifically endorsed not inventing schema just to make the strip look complete — "instead of
inventing data, creating speculative tables, or bending the architecture, engineering made the UI
resilient to the actual state of the system... The canonical page should grow because the underlying
school intelligence grows, not because we keep manufacturing UI fields." He also confirmed the real
claimed-school test result (resolving to "School-claimed", not "Verified") as meaningful evidence
that the three-state identity model doesn't accidentally collapse claimed and verified.

**One correction to the mental model, not the code:** the "4 of 6 slots say Not yet verified" result
is the state of Increment 5, not the final content model for the strip — Increment 5 established the
*presentation architecture*, not the strip's full intelligence. Slots go from "Not yet verified" to
real values only as the underlying data-enablement work below actually lands, never by special-casing
the strip itself.

**One UX note for later, explicitly not reopening this increment for it:** the identity photo
currently renders as its own block above the existing header (photo + banner, then the pre-existing
name/facts/actions header). Prav's canonical intent is for the photo to live *inside* the identity
header as one unit (photo, name, location, facts, trust state, actions together), not as a separate
pre-header section. Filed below under "Canonical Page Structural Refactor," not fixed now.

**Backlog captured verbatim from Prav's review, for whenever these are picked up as increments —
none of this is scoped or estimated yet, just recorded so it isn't lost:**

*Canonical Page Structural Refactor* (presentation-only, no new data needed):
- Integrate the photo naturally into the identity header (see UX note above).
- Finalize the above-the-fold hierarchy.
- Refine identity banner wording/visual treatment.
- Decision Strip visual polish.
- Section ordering.
- Mobile information hierarchy.
- Conditional module rendering.
- Canonical answer-first section structure.

*Data-enablement backlog* (each is an independent data/product capability — explicitly **not** to be
solved merely to populate today's six slots):
- Establish a public `api.*` read path for school media.
- Establish an appropriate public read path for fee data.
- Establish school-linked admission-cycle data (today's 10 `admission_cycles` rows are all
  exam-linked, `school_id IS NULL` — see the scoping entry above).
- Eventually establish a school-verification state beyond "claimed."
- Board/result data source.
- Student–teacher ratio data source.

**Known limitation, recorded rather than hidden:** browser visual smoke test at mobile/desktop
widths remains unavailable — this sandbox's egress proxy blocks a real browser from reaching the
Supabase host.

**Next:** per Prav's direction, move to the next increment rather than expanding this one. Roadmap
doc (`docs/spec/school-entity-page-v2-roadmap.md`) is now due for the correction pass that was
deferred until increments were locked — its Phase 0/2/5 schema assumptions and Phase 1 scope need
updating to match everything found in Increments 4-5 before picking increment 6.

## 2026-09-28 — Increment 6 selection: fresh review, not the roadmap's old ordering

Per Prav's instruction not to pick the next increment off the roadmap's original sequencing, ran an
explicit comparison of the corrected roadmap's open tracks against five criteria (value now,
data-readiness today, risk removed, foundation for admissions/fees, small-and-lockable). Full table
in the conversation; the live check that decided it: `audit_log` (candidate backing for "updates
timeline") has 170,236 real rows but — same architectural gap as `fee_items`/`school_media` — no
`api.*` view, and its raw shape (`actor` uuid, `before`/`after` JSON diffs) needs a deliberate
public-safe redaction design before it could be exposed at all. That's real scoping work, not a
quick add, so "finish Phase 1" doesn't score as small the way it first looked.

**Selected: Coverage card** (Phase 1's remaining public-page piece, design variant A). Wins on all
five: needs zero new queries (it's a restatement of facts Increment 5 already established), doesn't
touch schema, and extends the same normalizer pattern (`domain data → normalized status →
presentation`) Increment 5 just proved out. Sequencing after: structural refactor (Increment 7),
then a dedicated `school_notices` scoping pass — not bundled into any "next increment," matching the
same caution the original roadmap already gave Phase 6.

**Scope locked by Prav before code, tightened from the design's original mockup:**
- No numerical completeness score (no `7/10`, no `70%`, no progress bar, no ranking) — "the
  underlying data is too uneven for that to be meaningful."
- Two plain buckets: "What SchoolOye knows" (a usable fact exists) / "Still being verified"
  (currently unavailable) — **known is never equated with verified**.
- Single source of truth: reuse Increment 5's `decisionSlots` for Admissions, Classes offered,
  Location, Annual fee, and Board results — do not re-derive any of them. Identity, Board &
  affiliation, Contact, and Staff use the exact existing page conditions (the same ones the "School
  facts"/"Location"/"Contact" sections already use for their own `NotYetPublished` fallback).
- "Are you from this school?" reuses the existing claim flow. "Know something? Tell us" is a plain
  `mailto:help@schooloye.in` link — an existing pattern already used on two other pages, zero new
  infrastructure, chosen explicitly over building any anonymous contribution mechanism (there is
  none today — `correction_requests` is member-only via `/portal/edit-request`).
- Explicitly excluded: anonymous `correction_requests`, a public contribution form, any new table,
  any new `api.*` view, facilities/fee/admission-linking ingestion, a completeness score, new
  SEO/indexation behavior, generic AI-generated "missing information" copy.

**Built:**
- `src/lib/coverage.ts` — `buildCoverage(decisionSlots, pageFacts)`, ten topics, pure and
  unit-tested. Five topics (`admissions`, `classes_offered`, `location`, `annual_fee`,
  `board_results`) read their status straight off the same `DecisionSlot[]` the decision strip
  already computed for that render. Four (`identity`, `board_affiliation`, `contact`, `staff`) come
  from the same boolean conditions already in `entity-page.tsx`'s JSX. One (`facilities_safety`) has
  no dynamic input at all — `school_facilities` has zero rows and no `api.*` view (same gap found
  for fee/media in Increment 5), so it's permanently "being verified" until that data-enablement
  work happens, mirroring `unsupportedSlot`'s reasoning in `decision-strip.ts`.
- `src/components/ui/coverage-card.tsx` — purely presentational, splits topics into the two buckets,
  renders the claim link (plain `<Link>` to `/for-schools/claim/{id}`, shown only when unclaimed —
  **not** a second `<ClaimStatusLink>` instance; that component's own doc comment assumes exactly
  one instance per page, one client-side session/membership lookup, and the header already renders
  it — a second instance would double that cost and duplicate the CTA text for no benefit, so this
  reuses the underlying claim *flow* via a plain server-rendered link instead, which is safe because
  the claim page itself already handles the pending/rejected redirect server-side, from Increment
  4) and the `mailto:` "Tell us" link.
- Wired into `entity-page.tsx` right after the decision strip: `coverageTopics` computed alongside
  `decisionSlots`, reusing `team` (already fetched for the Teachers section) for `hasStaff` and
  `board`/`school.phone`/`email`/`website` (already read elsewhere on the page) for the other three
  page-derived facts.

**Verification performed:**
- `pnpm run typecheck` — clean. `pnpm run lint` — two import-order fixes (`@/lib/coverage` sorts
  before `@/lib/db/public-adapter` and before `@/lib/decision-strip`, same Biome
  `assist/source/organizeImports` rule as the last two increments), then clean (280 files).
  `pnpm test` — **117/117 pass** (111 existing + 6 new for `src/lib/coverage.test.ts`: fixed
  ten-topic order and ids, a fully-sparse school has every topic `being_verified`, the five
  slot-derived topics track `decisionSlots` exactly without re-deriving them, the four page-fact
  topics are independent of each other and of slot data, and `facilities_safety` is unconditionally
  `being_verified` regardless of every other input).
- **Real-data regression check** against the same two real schools used in Increment 5's
  verification (not just unit tests): confirmed via live queries that both St. Xavier's (unclaimed)
  and R.K. International (claimed) have a website (no phone/email) → Contact information known for
  both; both have a CBSE board record → Board & affiliation known for both; both have zero active
  rows in `school_teacher_affiliations` → Staff correctly `being_verified` for both. Matches what
  the pure function's unit tests already predict for this exact input shape — confirms the page's
  wiring (not just the function in isolation) pulls the right fields.
- No schema, migration, RLS, or new `api.*` view — confirmed by inspection (no `.from()` call added
  anywhere; `coverage.ts` takes only the same `decisionSlots` and already-fetched page facts as
  input).
- **Not yet done:** browser smoke test at mobile/desktop widths — same accepted, recorded limitation
  as Increments 4/5 (this sandbox's egress proxy blocks a real browser from reaching the Supabase
  host).

## 2026-09-28 — Increment 6: LOCKED

Prav reviewed the diff (`2c66d04`) and locked it. Specifically called out the zero-new-`.from()`-calls
result as the important signal: "the Coverage Card has become a projection of the existing
entity-page truth rather than another competing definition of school completeness... a healthy
pattern we should preserve for future presentation work."

**Next:** Increment 7 — structural refactor of the canonical page (photo/header integration,
above-the-fold hierarchy, section ordering, mobile hierarchy, decision-strip visual polish,
conditional module rendering) — named explicitly by Prav, not chosen from a fresh comparison this
time. `school_notices` stays deferred as its own dedicated scoping pass after that, not bundled in.

## 2026-09-28 — Increment 7: Canonical page structural refactor

**Scope locked by Prav before code** (full detail in his scope message; summarized here): establish
one information hierarchy, remove redundant presentation of the same fact, optimize the mobile
decision path — without changing the data model. Required a component/content-inventory pass first
(every visible fact mapped to Header / Decision / Detailed section / Coverage / Action) to find
objective duplicates rather than refactoring by visual instinct. Two additional items Prav approved
after I flagged them as open questions: remove the header's `StatusPill` (its job — "is admissions
open now" — is already the Decision Strip's Admissions slot; render removed, component/logic kept
since `StatusPill` is still a legitimate owner elsewhere — see below), and move the freshness/verified
line out of "School facts" into the header, next to the record badge, so the three trust signals
(Identity banner = entity/claim state, Record badge + freshness = provenance/origin, Coverage = what's
known) sit next to each other instead of scattered across the page.

**Built** (all in `src/app/[locale]/_views/entity-page.tsx`, presentation-only — no new
`.from()` calls, no new fields read):
- Removed the header's admissions-urgency `StatusPill` render (and its now-unused local
  `deadlineInput`/`pill` computation) — duplicated the Decision Strip's Admissions slot exactly.
  `StatusPill`, `deadlineState`, and `deadlineToPill` are still imported and used elsewhere in this
  same file (the search-results `SchoolCard` grid above the fold), so nothing was deleted from the
  codebase — only this one rendering site.
- Moved the freshness/verified-at line from under "School facts" to the header, next to the record
  badge span. Reused `recordBadge`'s existing `verifiedAt` value and the same `FreshnessLine`
  component and ternary — `<FreshnessLine .../>` when `verifiedAt` is set, an explicit
  `"Not yet verified"` span otherwise. **Caught and fixed a self-introduced regression here**: my
  first pass at this move only kept the truthy branch (`{verifiedAt && <FreshnessLine .../>}`) and
  silently dropped the `"Not yet verified"` fallback for the null case, meaning every unverified
  school (which, per Increment 6's real-data check, is currently every school in production) would
  show no provenance signal in the header at all. Restored the explicit ternary with the fallback
  span before running any verification — recorded here per the standing instruction to log my own
  mistakes rather than silently correct them.
- Removed the Coverage Card from directly under the Decision Strip and added a compact action layer
  in its place: `Call` (`tel:`, only when `school.phone[0]` exists), `Website` (only when
  `school.website` exists), `Directions` (Google Maps search link, only when `mapPoint` — pre-existing,
  untouched — resolves), `Enquire` (anchor to the existing enquiry form, unconditional). All reuse
  data already fetched for the header/Contact/map sections; no new query.
- Removed the "Grades" row from "School facts" (identical string already shown in the header and the
  Decision Strip's Entry classes slot — no added value) and the "Fee range" row (Decision Strip and
  Coverage already say "Not yet verified" for this; a third identical row added nothing).
- Made the empty-Admissions state compact: when `admissions.length === 0`, the section's `<h2>` drops
  to `text-meta font-semibold text-muted-ink` styling and the body becomes an inline
  `"· Dates not announced"` span instead of a full heading + paragraph block — matches the
  "proportionate, not full-content-looking" rule for empty modules.
- Moved `<CoverageCard>` from directly under the Decision Strip to after the Teachers section and
  before Similar Schools, per the locked hierarchy: identity → decision → action → answers →
  coverage/trust → discovery.
- Left the Contact/Enquiry `<aside>` and the claim-CTA duplication (plain `<Link>` in `CoverageCard`
  alongside the header's `<ClaimStatusLink>`) untouched, per Prav's explicit "no problem with that
  duplication" and "keep as already approved" instructions.

**Verification performed:**
- `pnpm run typecheck` — clean, no errors.
- `pnpm run lint` (`biome check .`) — clean on first run, 280 files, no import-order fixes needed
  (no new imports added this increment — only JSX/logic reorganization of existing imports).
- `pnpm test` — **117/117 pass**, unchanged from Increment 6 (presentation-only refactor of already
  battle-tested pure functions; no new testable logic introduced).
- **Real-data regression check** via live SQL against `api.public_schools` /
  `api.public_school_admissions`: confirmed **zero schools in production currently have
  `last_verified_at` set**, meaning the header's "Not yet verified" fallback (the exact branch my
  self-caught regression had deleted) is not a rare edge case — it is the universal current state
  for every school on the live site, which makes this the most important check performed this
  increment. Also confirmed zero schools currently have any school-linked admission rows (matches
  the `admission_cycles.school_id = NULL` finding from Increment 5), so the compact empty-Admissions
  state is likewise the universal current rendering, not a rare path. Separately confirmed real rows
  exist for both action-layer branches: St. Xavier's Senior Secondary School and R.K. International
  School (the same two schools used in Increments 5/6's checks) each have a website and no phone —
  `Website` renders, `Call` does not; other schools (e.g. S R Dayanand Sen. Sec. School) have a
  `phone[0]` value — `Call` renders for those. `Enquire` is unconditional. `Directions` depends on
  the pre-existing, untouched `mapPoint` computation, not re-verified here since Increment 7 didn't
  touch it.
- No schema, migration, RLS, or new query architecture — confirmed by inspection: every line changed
  is JSX structure, conditional className logic, or moving an existing element; no `.from()`,
  `.select()`, or new field reference was added anywhere in the diff.
- **Not yet done:** browser smoke test at mobile/desktop widths — same accepted, recorded limitation
  as every prior increment this session (this sandbox's egress proxy blocks a real browser from
  reaching the Supabase host).

## 2026-09-28 — Increment 7: LOCKED

Prav reviewed the diff (`edc16cf`) against every point of the pre-code scope lock and locked it —
full item-by-item checklist confirmed (StatusPill removal/preservation, freshness move with the
"Not yet verified" fallback restored, duplicate row removal, compact empty-Admissions state,
Coverage reposition, action layer, unchanged Contact/claim behavior, no schema/query changes,
typecheck/lint/117 tests/production regression all ✅; browser smoke test remains the same accepted
sandbox limitation).

Called out the self-caught freshness regression specifically as validation of the implementation-log
discipline: "You caught it before verification and commit, restored the original ternary behavior,
and recorded the mistake explicitly... a good reason to keep the implementation-log discipline
rather than simply treating green tests as sufficient." Also explicitly ruled that the universal
`last_verified_at = NULL` / zero-admissions production state is a **data-enablement issue**, not an
Increment 7 presentation defect — the page correctly represents that sparse state rather than hiding
or manufacturing it.

**Next:** not another UI increment. Prav is directing a dedicated architecture/scoping pass for
`school_notices` / school-intelligence data — admissions, fees, facilities, freshness, and updates
are currently constrained by missing or fragmented data paths, and the canonical page is now coherent
enough that further UI work would just polish permanently-empty sections. Same discipline as every
prior scoping pass this session: live schema → existing domain capabilities → actual production
data → missing capability → smallest viable architecture → implementation. This is a scoping
exercise only — no implementation until Prav locks scope.

## 2026-09-28 — `admission_notices` → `admission_cycles` capability/gap inventory

Deep-dive scoping pass (not implementation) into the promotion bridge between `admission_notices`
(the ingestion/review layer, 276 real rows) and `admission_cycles` (the canonical projection the
public page reads, 10 rows, all exam-linked with `school_id = NULL`).

**Key findings:**
- Today, "Approve" in `/ops/notices` only flips `admission_notices.review = 'approved'`; nothing
  reads that flag downstream. No code anywhere writes to `admission_cycles`.
- Of the 6 approved, `page_kind = 'admission_notice'` rows, only **1** has both a mappable status
  and a real `opens_on`/`closes_on` date. The other 5 fail on empty `cycles[]`, unreadable
  extraction, or an unmappable `status_hint` (`"unknown"`, not a member of the `admission_status`
  enum). Confirms approval today means "a human looked at the source," not "ready to publish."
- `admission_cycles` has `UNIQUE (school_id, academic_year, class_code)` and a
  `school_xor_exam` check constraint — a safe, pre-existing upsert key.
- `field_provenance` (85,068 rows) has never been used for anything but `entity_table = 'schools'`
  — extending it to admissions would be new, not reuse.
- No existing code writes to `admission_cycles`, and no correction/rejection/supersession
  mechanism exists for it — any promotion design has to define this from scratch.

**False finding, corrected before any runtime change:** initially identified the missing
verification predicate on `api.public_school_admissions` (and the matching gap in the
`cycles_public_read` RLS policy) as a publication-safety bug — the live view has no
`verification` filter, while its sibling `api.public_exam_admissions` does, and two comments in
`public-adapter.ts` plus `docs/spec/admissions-tracker.md` both claimed the school-linked view
was gated the same way. Prav authorized a prerequisite fix on that basis. Before writing it,
inspection of `docs/spec/data-and-trust.md` §3 and the header of `db/views/010_public_schools.sql`
established that the missing gate is **intentional**: Prav's D-119 (28 Sep 2026) explicitly
suspends data-and-trust.md's rules 1–5 repo-wide, including the admissions verification gate —
"a school is public when `schools.status = 'published'`, and every field is shown as stored." The
two comments and the spec doc were stale relative to a same-day decision, not the live view.
**No SQL, RLS, or data was changed.** Corrected instead: the self-contradictory header comment in
`db/views/020_public_school_admissions.sql` (it opened with the correct D-119 description but kept
three leftover pre-D-119 sentences describing the suspended gate), the two wrong claims in
`public-adapter.ts`, and the outdated statements in `docs/spec/admissions-tracker.md` (via a dated
correction note, keeping the original 27-Sep snapshot table intact per this session's established
convention). Verified via `pnpm run typecheck`, `pnpm run lint`, `pnpm test` (117/117) — comment/doc
changes only, no logic touched.

This also sharpens the admissions value question: under D-119 there is no verification gate
protecting a promoted `admission_cycles` row from public display — `verification` can describe a
canonical record's state but cannot be relied on as the publication safety mechanism. Any future
promotion pipeline has to establish publication-worthiness itself, before writing to the canonical
path, not after.

**Decision:** Increment 8 (normalization + promotion) is paused. Next is a product-level
admissions/school-intelligence **value audit** — using the real 276-row corpus (and the broader
question of what's worth promoting: admissions vs. mandatory disclosures/contact vs.
facilities/safety vs. other structured data) to decide whether, and how narrowly, to build a
promotion pipeline at all — before any further engineering on this. `school_notices` as a general
abstraction is explicitly not being created; `admission_notices` stays the concrete domain until
the audit says otherwise.

## 2026-09-28 — Admissions engineering: deferred

Completed the value audit called for above, independently researched rather than assumed. Findings:

- **Industry research** (Delhi DoE nursery circular, state RTE portals like Haryana's UJJWAL)
  shows two real patterns for admissions data: a **shared authority calendar** (one government/board
  circular applies to every school in a jurisdiction at once) and a **school-specific cycle** (the
  school's own dates/tests, self-reported). The one genuinely-complete record in our approved-notices
  sample (Salwan Public School, Mayur Vihar, nursery) turned out to be exactly the Delhi DoE calendar,
  not a school-specific fact — the AI-extraction pipeline was rediscovering a shared fact through an
  individual school's page, at far lower leverage than curating it once.
- **Geographic check on the pilot crawl:** of the 50 schools in `admission_notices`, 21 are Delhi
  districts and 22 are Haryana; only **5 are Jaipur** — SchoolOye's actual initial market. The
  Delhi/Haryana-derived "shared calendar" insight is real but was found almost entirely outside our
  target market.
- **Jaipur-specific check, both live data and independent web research:** all 9 Jaipur
  `admission_notice`-page_kind rows have empty `cycles: []` — no usable structured dates were ever
  extracted for any Jaipur school. Independently, a live competitor ([UniApply's Jaipur nursery page](https://www.uniapply.com/schools/nursery-admission-dates-in-jaipur/))
  confirms Jaipur has no Delhi-style common calendar: "admission windows in Jaipur vary from school
  to school," tracked individually across 74 schools with staggered dates. The shared-calendar model
  does not generalize to our market; only the school-specific-cycle pattern would apply here, and we
  have no reliable source for it yet.
- **Adoption check:** `school_claims` has exactly **1 row**. A school self-service admissions
  workflow (the proven, simple "Pattern 2" mechanism, already partially spec'd as the P1 admissions
  editor) would currently be unreachable by nearly the entire school base.

**Decision: admissions engineering deferred.** Not building: the notice→`admission_cycles`
normalization/promotion pipeline (Increment 8 as scoped), a shared-calendar/fan-out mechanism, the
P1 school admissions self-service editor, a new admissions semantic/provenance model, or a
generalized `school_notices` abstraction. This is a product decision, not a failure to find an
architecture — live inventory and independent market research did not establish a sufficiently
reliable or scalable source for school-specific admissions data across SchoolOye's initial
Jaipur/Haryana/Delhi target. `admission_notices` remains in place as a research/discovery signal
(a crawler hit can become an internal research lead, never an automatic promotion) and
`admission_cycles`/`api.public_school_admissions` remain available, unchanged, for whenever a
trustworthy source or clear demand signal emerges. Explicitly not concluded: "admissions doesn't
matter" — only that building infrastructure against the current hypothesis is premature.

Deliberately not promoted to "the next increment": claimed-school growth. Low claim adoption (1
row) explains why school self-service can't work yet, but SchoolOye's original thesis is to build
useful canonical school intelligence from public/authoritative sources first and give schools a
reason to claim afterward — pivoting the whole roadmap to claim-growth on this basis would repeat
the same mistake (building infrastructure on a single, unvalidated hypothesis) one level up.

**Architectural principle worth keeping for fees, facilities, results, transport, safety, rankings,
and any future domain:** don't build a promotion pipeline just because a table with rows exists.
Ask "is this information valuable, reliable, and scalable enough to become canonical SchoolOye
data?" first, with real evidence from the actual target market, and only then design the pipeline.

**Next:** return to the canonical page itself rather than open a new backend subsystem — but as one
bounded candidate audited with this same discipline (existing source → actual coverage → actual
usefulness → acquisition cost → only then architecture), not an open-ended sweep across every
possible category at once. Not yet chosen with Prav.

## 2026-09-28 — Real-data validation: DAV Public School Gurugram admissions, two bugs found and fixed

Per Prav's explicit instruction to validate the "Admissions Discovery & Action" direction against a
real school rather than more architecture discussion, used **D.a.v. Public School, Sector 14,
Gurugram** (school_id `2aeedc47-247c-41d4-bd84-4b46eaff1560`) and its real registration pages
(`dav14gurgaon.com`) as the concrete test case. Confirmed the entity match by address text, not name
similarity alone — the DB's superficially-similar "DAV Public School Sec-14" record has website
`dav14faridabad.ac.in` and is actually in Faridabad; the correct record's website is
`dav14gurgaon.org` with address confirming Sector 14, Gurugram.

**Data written (via `mcp__Supabase__execute_sql`, N-11 override, zero new code/UI needed):**
- Nursery 2027-28: form window closed (`closes_on` 2026-08-12), `status = 'closed'`, `ops_verified`.
- Class XI 2026-27: genuinely open per the school's own "REGISTRATION OPEN FOR CLASS XI" page,
  `status = 'open'`, no dates published by the school (`opens_on`/`closes_on` both null),
  `ops_verified`.

This alone proves the cheapest part of the "Admissions Discovery & Action" model: a real admission
fact can be entered directly into `admission_cycles` via SQL, by a human who checked the source, and
it reaches the canonical page through existing infrastructure — no AI extraction, no editor, no new
table.

**Correction to my own first pass:** initially fetched only the Nursery URL Prav gave and reported
the cycle as closed. Prav pushed back: submission was still open on that same page, and — more
importantly — stated the actual requirement plainly: *"if tomorrow some user comes to the site, he
... wants to know if this particular school has admission open, if not when it opens, and which all
schools are they who have admissions open."* Re-fetching the source page verbatim rather than
either dismissing or blindly accepting the correction: the Nursery cycle genuinely was closed (no
contradicting evidence), but the re-check surfaced a second link on the same page, to Class XI
registration, missed on the first pass. That page confirmed a genuinely open cycle, written as the
second row above. Net: Prav's correction was right, but the fix was "read the whole source," not
"mark Nursery open."

**Bug 1 — closed cycles rendered as if still live.** `buildAdmissionsSlot` (`decision-strip.ts`)
only ever checked `status === 'not_announced'` to decide unverified-vs-available, never whether a
stored `closes_on` had actually passed. The real closed-Nursery row rendered "Closes 12 Aug 2026" in
the Decision Strip with the same confident/bold styling as a live deadline — `DeadlineMargin`
elsewhere on the same page already got this right by deriving status from `deadlineState()`
(`src/lib/deadline.ts`), the same pure, tested, IST-calendar-day function; `buildAdmissionsSlot` had
its own separate, incomplete inline logic instead of reusing it. Fixed: `buildAdmissionsSlot` now
takes a required `now: Date`, calls `deadlineState({ closesAt }, now)`, and renders a plain `"Closed"`
value instead of the past date when `deadlineState` says `status === "closed"`. `buildDecisionStrip`'s
input type now requires `now`; `entity-page.tsx` (which already computed `now = new Date()` for other
purposes) passes it through.

**Bug 2 — wrong cycle chosen as primary when a school has more than one.** `entity-page.tsx` picked
`primaryAdmission = admissions[0]`, and `getPublicAdmissionsBySchoolId` orders by
`closes_on ascending, nulls last` — so the closed Nursery row (has a date) sorted *before* the open
Class XI row (no date yet), making the Decision Strip show the closed cycle as the school's headline
admissions status. Fixed with a new exported `selectPrimaryAdmission()` in `decision-strip.ts`: picks
the first cycle whose `status` is still actionable (`not_announced`/`upcoming`/`open`/`closing_soon`,
i.e. not `closed`/`results_out`), falling back to the existing order only when every cycle on the
school has concluded (so a school with only past cycles still shows its most recent one, not
nothing). `entity-page.tsx` now calls this instead of indexing `[0]` directly.

**Also fixed:** a third stale D-119-era comment in `public-adapter.ts` (`queryPublicSchools`'s
`admissionsOpen` block) still claiming an "approval-verification gate" on
`api.public_school_admissions` that D-119 removed — same class of stale comment as the two already
corrected in the false-finding entry above, found while working in this file for Bug 2.

**Verified:** `pnpm run typecheck`, `pnpm run lint`, `pnpm test` all clean (123/123 — 6 new tests:
the past-`closes_on` "Closed" case, a genuinely-future-date control case, and three
`selectPrimaryAdmission` cases covering the DAV multi-cycle scenario, an all-closed fallback, and an
already-correctly-ordered case). Re-queried `api.public_school_admissions` for the DAV school after
the fix to confirm the live shape matches what the tests assert: closed Nursery sorts first from the
raw view, `selectPrimaryAdmission` correctly returns the open Class XI row as primary, and
`buildAdmissionsSlot` renders it as an available admissions slot with "Dates not yet announced" (no
fabricated date, since the school hasn't published one) rather than the closed cycle's stale
deadline. No schema, migration, RLS, or view change — presentation-layer logic only.

**What this confirms about the discovery-list mechanism specifically:** `queryPublicSchools`'s
`admissionsOpen` filter (`?admissions=open` on `/schools` and city browse pages), which already
existed before this session, is the exact "list of schools with admissions open" Prav asked for —
DAV Gurugram's now-open Class XI cycle will surface there. The filter is not city-gated by anything
in its own logic, but the pages that call it (`place-page.tsx`, `schools/[state]/[city]/page.tsx`)
404 for any city where `is_launch = false`, and ~~Jaipur is currently the only launched city~~ — so
today this list is reachable only for Jaipur, even though DAV Gurugram's data is now correctly
published and its own entity page works. This is a separate, larger decision (launching additional
cities) from the admissions mechanism itself, not a bug in the mechanism — flagged for Prav to weigh
in on next, not resolved here.

> **Correction (same day, next entry below):** the strikethrough claim above is false and should
> never have been written without a live check — `is_launch` has been data-driven since before this
> session's Increment 1 (`db/views/040_public_areas.sql`, D-119: a district is launched when it has
> ≥1 published school), and 23 areas already qualify, Gurugram included (480 published schools). See
> the next log entry for the full correction and root cause.

**Not built, deliberately, per the "Admissions Discovery & Action" reframing Prav approved:** no AI
extraction, no self-service editor, no shared-calendar fan-out. The manual/incremental model —
staff or Prav personally verifies a school and writes the fact directly — is what this entry
validates end-to-end for one real school.

## 2026-09-28 — 🟢 LOCKED: admissions display correction (`4f8afa9`); next experiment decided

Prav reviewed and locked the previous entry's fix. Recorded verbatim as his decision:

> The existing canonical admissions data model and page already support the parent-facing
> experience we want, provided trustworthy admission-cycle data gets into `admission_cycles`. No
> new admissions architecture is required to test this.

**Decision: run a manually-verified admissions pilot, not an ingestion engine.** Take roughly
50–100 important schools across the initial target markets, manually research per school (is
admissions open, which class, academic year, deadline, official application URL, source, last
checked), and write only genuinely-verified cycles into `admission_cycles` — the same mechanism
already proven end-to-end on DAV Public School Gurugram. Measure before automating: how many
schools actually have open admissions, how much useful information is obtainable per school, how
often parents click the admissions CTA, which classes draw interest, how often dates change, and
how much research effort one school costs. If the pilot's numbers justify it, automate the
**research/discovery workflow** next (crawler/search → "possible admissions update" → research
queue → human verification → `admission_cycles` → SchoolOye) — AI as a research assistant
surfacing leads, never as the publishing authority. If the numbers don't justify it, the cost of
finding that out is a manual pilot, not months of backend engineering.

**City launch is explicitly kept a separate decision from this pilot.** `?admissions=open` already
works technically for any city, but Prav does not want to launch Gurugram/Delhi/Haryana discovery
merely to make the filter light up on thin, mostly-unverified inventory. Sequencing locked:
(1) validate the admissions experience with manually-verified cycles, (2) measure demand,
(3) decide which cities have enough verified inventory to justify launching discovery there,
(4) only then enable those cities' discovery pages. `school_notices` / promotion-pipeline
normalization is explicitly de-prioritized again in favor of this pilot.

**Not yet decided with Prav:** which markets/schools to prioritize for the pilot given Jaipur is
currently the only launched city (so it's the only place the `admissions=open` discovery list is
reachable today, even though any individual school's own entity page — like DAV Gurugram's — is
reachable and correct regardless of city-launch status). This affects how "measurable parent
activity" gets read during the pilot and is flagged as the next thing to settle before starting to
pick schools.

> **Correction (same day, next entry below):** "Jaipur is currently the only launched city" is
> false — see the next log entry. 23 areas are already launched (data-driven, D-119), Gurugram
> included, so the "city launch" sequencing point above is superseded: there is no separate city-
> launch gate left to sequence behind for any district that already has published schools. The
> pilot-market question in this entry stands on its own merits, not on a city-launch constraint.

## 2026-09-28 — False finding, corrected: city-launch gating was already exactly what Prav asked for

Prav's next message stated a new architecture decision — SchoolOye should launch nationally, not
gate discovery pages by city-launch status — explicitly correcting what he understood, from my own
last two log entries and my own chat replies, to be the current architecture ("Jaipur is currently
the only launched city," "should not gate discovery pages by city launch status... previous
city-launch gating assumption should be considered superseded").

**Before touching any code, live-checked the actual current state, per this session's own
established discipline — and it does not match what I'd been telling Prav.** Both statements above
are false, and have been false since **before this session's Increment 1** (the commit implementing
data-driven `is_launch` is the oldest commit in this repo's accessible history, `4010333`,
predating even the record-badge work). Live query against `api.public_areas` right now:

- **23 areas are already launched**, not 1: Delhi (1,184 published schools), Faridabad (983),
  Hisar (528), Gurugram (480), Sonipat, Panipat, Palwal, Karnal, Rohtak, Jind, Bhiwani, Jhajjar,
  Yamunanagar, Kaithal, Rewari, Ambala, Kurukshetra, Mahendragarh, Fatehabad, Nuh Mewat, Sirsa,
  Jaipur (103), Panchkula, and Charkhi Dadri (2) — essentially every Delhi-NCR/Haryana/Rajasthan
  district the crawl actually populated.
- `db/views/040_public_areas.sql` (header dated D-119, 2026-09-28, already in place before this
  session started) makes `is_launch` **purely data-driven**: `exists (select 1 from
  api.public_schools ps where ps.district_id = d.id)` — a district is launched the moment it has
  ≥1 published school, "with nothing here to keep manually in sync." It replaced an earlier
  hardcoded `LAUNCH_DISTRICT_SLUGS`/`d.slug in ('jaipur', 'gurugram')` list — the very model I
  described to Prav as current.
- DAV Public School Gurugram (`2aeedc47-247c-41d4-bd84-4b46eaff1560`, the real-data test case from
  the previous entries) sits in district_id 6, `area_slug = gurugram`, `is_launch = true`. Its page
  and its now-open Class XI admissions cycle are **already fully discoverable today** via
  `/schools/haryana/gurugram?admissions=open` — there is no city-launch gate standing between it and
  a parent browsing that filter, and there never was, within this session.

**Root cause: I stated an architectural fact from memory/summary without re-verifying it live,** the
exact failure mode this session's own discipline exists to catch (see the D-119
verification-gate false finding earlier in this log) — and this time I didn't catch it myself before
saying it to Prav; he caught it by describing the "obsolete" model back to me, which is what
prompted this check. No SQL, RLS, schema, or application code was broken by this — the two mistaken
implementation-log paragraphs and one now-stale code comment
(`getSelectedAreaSlug` in `public-adapter.ts`, which called Gurugram's inventory "test data... no
published schools yet") are corrected inline and here.

**What this means for Prav's new instruction:** the architecture he asked for — "`/schools/{state}/
{city}` should work wherever there is sufficient underlying data, rather than returning 404 simply
because a city isn't launched" — **already exists**, byte-for-byte, in `040_public_areas.sql`'s
definition. There is no remaining code change to make for the core gating behavior: every page that
checks `.isLaunch` (`resolve.ts`, `place-page.tsx`, the `schools/[state]/[city]` family) is already
gating on "does this district have a published school," not on an editorial launch decision, and a
district with genuinely zero published schools still correctly has no page to show (matching Prav's
own "availability ≠ depth of coverage" caveat — there's no data to be available).

**What's genuinely still misaligned, and worth a small follow-up pass:**
- The field is still named `is_launch`/`isLaunch` everywhere (types, adapter, components), which
  reads as an editorial toggle and is exactly what caused this confusion. A rename
  (e.g. `hasPublishedSchools`/`isSupported`) would be more honest but touches ~15 call sites across
  `public-adapter.ts`, `resolve.ts`, `place-page.tsx`, the `schools/[state]/[city]*` route files,
  `sitemap.ts`, `city-picker.tsx`, `site-footer.tsx`, and `terms/page.tsx` — not done here, raised
  for Prav to decide whether it's worth the diff.
- Several docs (`docs/seo-canonical-pages-spec.md`, `docs/guidelines/seo-geo.md`,
  `docs/spec/urls-and-routing.md`) still describe this in "launched city" editorial language from
  before the D-119 rewrite. Not yet corrected — same "stale doc vs. live code" class as the D-119
  admissions-gate cleanup, flagged as follow-up, not done in this pass.
- No separate "operational priority market" concept exists yet, distinct from technical
  availability. Prav's message wants "research depth / sales activity / enrichment" to be a
  city-level rollout lever without gating the architecture — today there's no data structure for
  that at all (Jaipur is only a soft default via `getSelectedAreaSlug`'s cookie fallback, now
  correctly commented as a product choice, not a technical constraint). If Prav wants this tracked
  formally (e.g. for sequencing the manual admissions pilot), it would be new, small, additive work —
  not yet requested as an increment.

**Practical effect on the open admissions-pilot question:** the market-sequencing concern raised in
the previous entry (Jaipur vs. Gurugram/Delhi for the pilot) is no longer a technical-reachability
question — it's purely which schools are worth Prav's research time first, since any verified
school's data is discoverable nationally today, DAV Gurugram included.

## 2026-09-28 — Prav's review of the false-finding entry: framing locked

Prav reviewed the previous entry and refined how it should be preserved. Recorded verbatim
(condensed) for the project history:

**Both false findings, named explicitly rather than folded into one correction:**
1. *"Jaipur is currently the only launched city."* Correct state: the live architecture is already
   data-driven — multiple areas are launched because they have published schools; Gurugram is
   already discoverable.
2. *"Gurugram/Delhi cannot test the full discovery → admissions funnel because they are not
   launched."* Correct state: they can. `/schools/{state}/{city}?admissions=open` already surfaces
   schools in any area meeting the published-school condition; DAV Gurugram is already reachable
   through that path today.

**Root cause, in Prav's own framing (kept verbatim — this is the reusable lesson, not just "we were
wrong"):** *"We inferred product/architecture state from an apparent naming convention (`is_launch`)
and memory instead of inspecting the live routing/query path and current data."*

**Explicitly not a new architecture decision.** The desired architecture was already implemented;
the interpretation of it was wrong. Nothing was corrected in the runtime behavior — only in what I
had told Prav about it.

**Explicitly deferred, not rejected, per Prav's call:**
- Renaming `is_launch`/`isLaunch` — real naming-clarity cleanup, contributed to the misreading, but
  a separate architectural task from the admissions pilot. Not touching ~15 call sites for this.
- An "operational priority market" table/field — pilot sequencing can be managed operationally
  (i.e. by Prav's own judgment of where to spend research time) until there's an actual product need
  for that state to be structured data.

**Locked interpretation going forward:**
- SchoolOye availability: broad/open wherever published school data exists.
- City/district discoverability: data-driven, not editorially gated.
- Operational focus (where HQ spends research/sales effort): centrally controlled, but not a
  prerequisite for discovery.
- Research depth: can vary by market without affecting whether a page exists.
- Admissions pilot: can include Jaipur, Gurugram, Delhi, and Haryana immediately — no city-launch
  gating to sequence behind.

## 2026-09-28 — Design reconciliation: canonical page vs. `school-entity-page-v2-design.html`

Prav flagged that the live canonical page is "not even close to" the agreed design. Checked by
decoding the actual design artifact rather than trusting `school-entity-page-v2-roadmap.md`'s
summary of it (that roadmap doc is itself stale — still headed "Increment 4 and 5 locked" — so it
predates Increments 6-7 and everything in this log since). `school-entity-page-v2-design.html` is a
compressed multi-file artifact snapshot (html+css+js), not plain markup — decoded it directly
(gzip+base64 inside the committed file) to extract the real section list rather than re-reading the
roadmap's paraphrase of it.

**The design's actual section order, top to bottom:** Identity header → "What's happening at
{name}" (events + News) → Official notices → At a glance (decision strip) → Admissions module →
Fees module → "What SchoolOye knows about {name}" (coverage) → Academics & outcomes →
Infrastructure & safety → Contact → Parent voice (reviews) → nearby/similar schools → Updates
timeline.

**Live page today, section by section:**
- ✅ Identity header — built (Increment 5).
- ❌ **"What's happening" (events + News feed) — not built at all.** No `events` table, no
  News-to-school tagging. Matches Phase 5, never started.
- ❌ **Official notices — not built at all.** No `school_notices` table exists (Phase 0, the
  foundational schema for school self-service publishing) — this is also why schools have no real
  write path into the product beyond the claim flow, a gap noted repeatedly in earlier entries.
- ✅ At a glance / decision strip — built (Increment 5), 2-3 of 6 slots carry real data
  (Location, Entry classes, and now Admissions when a verified cycle exists); the rest render an
  honest "Not yet verified."
- 🟡 **Admissions module — built as a fraction of the design.** Live version: cycle list +
  deadline margin + form URL + fee, per cycle (today's fixes made this trustworthy for the closed-
  vs-open case). Design also specifies: entry classes/seats/age table, an inline "check age
  eligibility" tool, application process steps, and a documents checklist. A standalone age-
  eligibility checker already exists (`/tools/age-eligibility`, `eligibility-checker.tsx`) but is
  **not embedded on the school page** — it's a separate, unlinked tool today.
- ❌ **Fees module — not built at all.** `fee_items` has 0 rows, no public read path, no school
  submission path. Explicitly deferred (Phase 3) pending the fee-disagreement design decision noted
  in the roadmap (school-provided vs. parent-reported "two figures" UI) — that decision itself was
  never confirmed with Prav.
- ✅ "What SchoolOye knows" / coverage card — built (Increment 6), matches the design's intent
  (record status: count + sources + missing-topics), variant A as the roadmap recommended.
- ❌ **Academics & outcomes — not built at all.** No table anywhere for board results by year or
  staff counts by category. Matches Phase 4, never started.
- ❌ **Infrastructure & safety — not built at all.** `school_facilities` exists, 0 rows, unused; no
  safety-certificate-with-expiry table exists anywhere. Matches Phase 4, never started.
- ✅ Contact — built, plus an enquiry form the design doesn't explicitly call out as its own module
  (may be folded into Contact in the design; not re-verified against the design's Contact section
  detail in this pass).
- ❌ **Parent voice (reviews) — not built at all.** No reviews subsystem exists. Matches Phase 6,
  never started — the roadmap itself calls this the most architecturally novel, highest-risk phase.
- ✅ Similar/nearby schools — built.
- ❌ **Updates timeline — not built.** Was explicitly held out of Increment 5's scope; still not
  picked up since (Phase 1 backlog item, `field_provenance`/`audit_log`-derived, no new schema
  needed).

**Honest summary: roughly half the design's named sections have zero implementation today** —
events/notices feed, official notices, fees, academics & outcomes, infrastructure & safety, parent
voice, and the updates timeline are all fully unbuilt. Of what is built, only the decision strip and
the new Admissions fix are "real data, not a mock"; identity, coverage, and similar-schools sections
work as designed; Admissions is a real but partial implementation of its design module.

**This is not a surprise finding relative to the roadmap's own tracking** — Phases 0 and 2-6 have
been marked unbuilt in `school-entity-page-v2-roadmap.md` since it was written, and the "Recommended
next increment" section at the bottom of that doc has said "not yet chosen with Prav" since before
today's admissions detour. What's actually wrong is that **the roadmap doc itself was never updated
after Increment 6 or 7 shipped**, so anyone reading it (including a fresh session) would get a
stale status. Flagged as the immediate next step — correct the roadmap doc's status header and
Phase 1 entry to reflect Increments 6-7, then get an explicit decision from Prav on which of the six
unbuilt sections (events/notices, fees, academics, infrastructure, parent voice, updates timeline)
is the next one to actually build, rather than continuing to treat the admissions detour as if it
were the whole roadmap.

## 2026-09-28 — Real root cause of "not even close to the design": a second, unimplemented visual system

Prav attached the design HTML directly and asked to port the canonical page to match it, with
"coming soon" placeholders for anything unbuilt. Before starting, decoded the attachment (same
compressed-artifact format as `school-entity-page-v2-design.html` — confirmed byte-identical
content) and inspected its actual markup, not just its section headings as in the previous
reconciliation entry. That surfaced something bigger than "missing sections":

**The design uses a completely different visual system than what's live anywhere on the site
today**, not a variation of it:
- Design: CSS custom properties `--so-bg`, `--so-surface`, `--so-ink`, `--so-accent`, `--so-amber`,
  etc. (light/dark pairs), font stack **IBM Plex Sans / IBM Plex Sans Devanagari / IBM Plex Mono**,
  container-query-driven responsive type (`clamp(...,...cqi,...)`), a `data-so-theme` attribute for
  theming.
- Live site (`src/app/globals.css`, `src/app/layout.tsx`): a completely different, older token set —
  `--color-ruled-blue`, `--color-margin-paper`, `--color-board-green`, etc. (the "school notebook"
  brief), fonts **Anek Latin/Devanagari + Mukta**, ordinary Tailwind breakpoints, no container
  queries.
- Confirmed via grep: **zero occurrences of "IBM Plex", "so-bg", "so-accent", or any `--so-*` token
  anywhere in `src/`.** The v2 visual design has never been implemented, not partially, not on any
  page — every component built in Increments 1-7 (badges, cards, the decision strip, coverage card,
  header, footer, nav) uses the old "notebook" theme's tokens (`font-display`, `text-ruled-blue`,
  `border-rule`, `bg-margin-paper`, etc.).

**This is the real answer to "not even close to the design."** It isn't primarily about the six
missing content sections from the previous reconciliation entry (though those are also real) — it's
that every section that *does* exist, including ones built to spec content-wise (identity, decision
strip, coverage card), is wearing the wrong skin entirely. A visitor comparing the live page to the
design would see a different font, different colors, different spacing system, and no dark mode —
on every element, not just the missing ones.

**Why this changes the scope of "port the existing page to match this HTML":** the design's own
mockup bakes in shared site chrome — a full header (logo, search bar, "Tracker/Saved/Compare" nav)
and presumably footer — using the v2 tokens. That chrome is shared across every page on the site
(`SiteHeader`, `SiteFooter`, `MobileBottomNav` per earlier increments' references), not scoped to
the entity page. Re-theming only the entity page's own content sections while leaving the shared
header/footer on the old "notebook" tokens would leave every visit to the school page showing two
different visual languages stitched together — old-theme chrome, new-theme content. Re-theming the
shared chrome too means every other page (search, city pages, home, claim flow, ops) inherits the
same token swap whether or not it's been individually re-verified against a v2 design for that page
that doesn't exist.

**Raised to Prav rather than decided here:** whether this is (a) a full site-wide token/font swap to
the v2 system, done once as its own foundational increment ahead of any content-section work, or
(b) scoped narrowly to the entity page's own content, accepting a visually inconsistent chrome/
content seam until the rest of the site is redesigned to match. Not proceeding with either without
his call — this is a large, hard-to-cheaply-reverse decision (a full re-theme touches every shared
component; a scoped version means redoing the chrome later anyway), not an implementation detail.

## 2026-09-28 — Increment 9: V2 visual foundation + shared chrome migration

Per Prav's detailed increment spec: established the V2 visual token/typography/theme
infrastructure and migrated the shared site chrome onto it, without touching entity-page content,
domain logic, schema, or URLs. Full Step 15 report below, as required.

### 1. Intended goal
Create a reusable V2 visual foundation (tokens, typography, theme) and migrate the shared global
shell (header, search, nav, mobile nav, footer) onto it, so the whole site has one coherent chrome
language, while leaving all page content on the existing v1 ("notebook") theme until Increment 10.

### 2. Actual changes
- `src/app/globals.css` — added a namespaced `--color-v2-*` token layer (12 semantic tokens, light
  values ported verbatim from the design), `--font-v2-sans`/`--font-v2-mono`, and a dark-theme
  override block (`@media (prefers-color-scheme: dark)` guarded by `:not([data-theme=light])`, plus
  `[data-theme=dark]` for manual override) with dark values also ported verbatim.
- `src/app/layout.tsx` — added IBM Plex Sans / IBM Plex Sans Devanagari / IBM Plex Mono via
  `next/font/google` (weights 400/500/600 Sans, 400/500 Mono — matching the design's own Google
  Fonts import exactly), exposed as CSS variables alongside (not replacing) the existing Anek/Mukta
  variables.
- `src/components/ui/button.tsx` — added `v2Primary`/`v2Secondary` variants (additive; existing
  `primary`/`secondary` untouched, still used everywhere outside the migrated chrome).
- `src/components/shell/site-header.tsx`, `site-footer.tsx`, `primary-nav.tsx`, `mobile-menu.tsx`,
  `mobile-bottom-nav.tsx`, `city-picker.tsx`, `auth-status-link.tsx` — every v1 token/class
  (`border-rule`, `bg-copy-white`, `text-ink`, `text-muted-ink`, `text-slate`, `text-ruled-blue`,
  `bg-margin-paper`, `border-line-blue*`, `font-display`) replaced with its v2 equivalent. Confirmed
  via grep: zero v1 token occurrences remain in these seven files.

### 3. Visual foundation
- **Fonts:** IBM Plex Sans (Latin) + IBM Plex Sans Devanagari (Devanagari) + IBM Plex Mono, loaded
  via `next/font/google`, combined as `--font-v2-sans`/`--font-v2-mono` → Tailwind utilities
  `font-v2-sans`/`font-v2-mono`.
- **Tokens:** `v2-bg`, `v2-surface`, `v2-sunk`, `v2-line`, `v2-line-2`, `v2-ink`, `v2-ink-2`,
  `v2-ink-3`, `v2-accent`, `v2-accent-ink`, `v2-accent-soft`, `v2-amber`, `v2-amber-soft` — each a
  Tailwind utility (`bg-v2-*`/`text-v2-*`/`border-v2-*`), values verbatim from the design's
  `:root,[data-so-theme=light]` and `[data-so-theme=dark]` blocks.
- **Theme mechanism:** CSS-variable cascade, not a `dark:` variant — automatic via
  `prefers-color-scheme`, with a `data-theme="dark"|"light"` attribute on `<html>` as a manual
  override path for a future toggle. **No toggle UI was built** — not requested, and every
  component just consumes `bg-v2-*`/`text-v2-*` utilities with zero per-component dark-mode code,
  satisfying "theme switching must not require rewriting individual components" without adding a
  framework the repo doesn't need yet.
- **Responsive mechanism:** unchanged — no layout/flex/grid/width/breakpoint classes were touched
  anywhere in this increment, only color and font-family tokens. The existing `md:` breakpoint
  structure in every migrated file is untouched, so responsive *behavior* (what stacks, what hides)
  is provably identical to before; only colors and typeface changed.
- **Primitives:** extended `Button` (2 new variants) rather than creating a new component
  hierarchy, per the "existing component + small extension" instruction. No new primitives were
  needed for this increment's actual scope (header/search/nav/footer reused existing markup
  patterns with new tokens).

### 4. Shared chrome
- **Header** (`site-header.tsx`): mobile bar (hamburger, brand, city picker) and desktop bar (brand,
  primary nav, search, city picker, auth link) both re-themed; sticky positioning/height/layout
  unchanged.
- **Search**: the header's inline search form — border, background, icon, input text, and
  placeholder all moved to v2 tokens.
- **Navigation** (`primary-nav.tsx`): active/hover states now use `v2-accent`/`v2-ink`.
- **Mobile navigation** (`mobile-menu.tsx`, `mobile-bottom-nav.tsx`): slide-in panel, overlay scrim,
  and the fixed 5-tab bottom bar all re-themed; `AuthStatusLink` inside the mobile menu now renders
  with the new `v2Primary` button variant.
- **Footer** (`site-footer.tsx`): background moved to `v2-sunk` (a step below `v2-bg`, matching the
  design's convention of a slightly recessed footer surface distinct from the page body), every
  link's color made explicit (`text-v2-ink`/`text-v2-ink-3` + `hover:text-v2-accent`) rather than
  left to inherit — necessary because the site's global `a { color: var(--color-ruled-blue) }` base
  rule would otherwise leak the *old* accent color onto every unstyled footer link; explicit utility
  classes override it via ordinary CSS specificity (class beats type selector), confirmed by reading
  the compiled cascade rather than assuming it.
- **Global page shell**: scoped to the header/footer pair only (the "boundary"), per the increment's
  own Step 8 — `<body>`'s background/text/link defaults were deliberately left on v1 tokens, since
  changing them would silently re-skin every unmigrated page's content, which this increment
  explicitly excludes.

### 5. What was deliberately NOT changed
Entity page content, admissions, fees, discovery pages, database/schema, RLS, Supabase queries, API
contracts, URL structure, SEO metadata/JSON-LD, claim logic, verification logic. Grep-confirmed: no
file outside `globals.css`, `layout.tsx`, `button.tsx`, and the seven shell components above was
touched.

### 6. Validation
- **Typecheck:** clean (`next typegen && tsc --noEmit`).
- **Lint/format:** clean after two formatting-only fixes (`biome format --write` on
  `site-header.tsx`/`site-footer.tsx` — attribute wrapping only, no logic change), then a clean
  `biome check .`.
- **Tests:** 123/123 passing (unchanged from before this increment — no test touches shell
  components directly).
- **Build:** **could not be verified in this sandbox** — `pnpm run build` fails to fetch *all six*
  Google Fonts (Anek Devanagari, Anek Latin, Mukta, IBM Plex Mono, IBM Plex Sans, IBM Plex Sans
  Devanagari) with "Failed to fetch ... from Google Fonts... behind a proxy" — this is the sandbox's
  existing egress restriction (same class as the previously-documented block on reaching the
  Supabase host from a browser render), not something this increment introduced: the pre-existing
  Anek/Mukta fonts fail identically to the new IBM Plex ones. `pnpm run build` was not part of this
  session's established verification trio (typecheck/lint/test) before this increment either, for
  the same underlying reason. Flagged as a real gap, not silently waved through.
- **Responsive/light-dark/a11y checks (Step 9-11):** no live-browser render was available (same
  sandbox limitation as the build check and the previously-documented `ClaimStatusLink` hydration
  check). Performed by analysis instead: (a) zero layout/flex/grid/width/breakpoint classes were
  touched, so responsive behavior is provably unchanged in shape; (b) computed WCAG contrast ratios
  for every foreground/background pairing actually used — `v2-ink`/`v2-surface` 17.2:1,
  `v2-accent`/`v2-surface` 6.8:1, `v2-ink-3`/`v2-surface` 5.65:1, and the dark-mode equivalents 15.8:1
  / 8.7:1 / 8.25:1 — all clear AA (4.5:1) for normal text; (c) every `aria-*` attribute, focus-visible
  outline, and keyboard interaction already present (hamburger `aria-expanded`, city picker
  `aria-haspopup`/`role=listbox`, nav `aria-current`) was preserved verbatim — none were removed or
  restructured. **This is analysis, not a rendered visual check** — a real-browser pass against the
  live deployment (not this sandbox) is the outstanding verification step, flagged rather than
  assumed.

### 7. Remaining visual debt
Every page's own content still renders in the v1 "notebook" theme (Anek/Mukta, ruled-blue/margin-
paper tokens) — home, search/discovery, the canonical school page (all sections), claim flow, ops,
teacher pages, guides, exams. The seam described in the increment spec (v2 chrome, v1 content) is
now live on every page. Increment 10 (canonical school page V2) is the next piece of this; every
other surface (home, search, claim, teachers, ops) has no scheduled increment yet.

### 8. Architecture risks for Increment 10
- The global `a { color: var(--color-ruled-blue) }` base-layer rule (still v1) will need the same
  explicit-override treatment this increment gave the footer, anywhere Increment 10 adds an
  unstyled link inside v2-themed entity-page content — don't assume inheriting from `<body>` is
  enough.
- `<body>` itself is still v1-themed (`bg-copy-white text-ink font-body`) — Increment 10 will need
  to decide whether the entity page wraps its own content in a v2-scoped container (this
  increment's pattern: token classes applied directly to the section's own root) or whether that's
  the point at which `<body>` itself finally moves to v2 defaults.
- No dark-mode toggle UI exists — if Increment 10's design expects a visible switcher (the design
  file's `data-so-theme="{{ theme }}"` binding implies the mockup expects one), that's new work, not
  something this increment's CSS-variable infrastructure alone provides.

### 9. Commit
`2156bf2`.

## Increment 9 — Pre-Lock Audit (8-Point Review)

Prav requested a final pre-lock audit before deciding whether to lock Increment 9, with 8 specific
points and an explicit instruction not to begin Increment 10 until after his review of this report.

### 1. Token naming decision
Renamed `--color-v2-*` / `v2-*` utilities / `v2Primary`/`v2Secondary` / `data-theme` to the design's
literal names: `--color-so-*`, `so-*` utility classes, `soPrimary`/`soSecondary`, `data-so-theme`.
No architectural reason existed to keep a separate `v2-*` scheme — the design reference already
defines its own semantic names (`--so-bg`, `--so-ink`, `--so-accent`, etc.), and inventing a second
naming layer on top would only add translation overhead with no benefit. No alias layer was created;
the old names no longer exist anywhere in the codebase (verified by grep — only 2 harmless residual
matches: the literal design filename `school-entity-page-v2-design.html`, and an explanatory code
comment about why `v2-*` wasn't used). Applied across all 9 files Increment 9 touched. Committed
separately from the original Increment 9 work (`2f1cf37`) so the rename has its own history entry.

### 2. Global body/page ownership decision
`<html>`, `<body>`, the global `a`/`a:hover` rule, and the global `:focus-visible` outline rule
remain untouched and v1-scoped (`--color-copy-white`, `--color-ink`, `--font-body`,
`--color-ruled-blue`). This is intentional, not an oversight: most existing page content relies on
inherited `<body>` font-family and default link/text color rather than setting its own, so changing
those globally would silently reskin every unmigrated page before its own content migration
(Increment 10+) has happened. V2/so-* is correctly positioned as the *eventual* global system — the
migration path is: shell first (this increment), then page-by-page content migration, then finally
retarget `<html>`/`<body>`/the global `a`/`:focus-visible` rules to so-* once no page still depends on
the v1 defaults. Forcing that switch now would violate the increment's explicit scope boundary and
was correctly not done.

One minor consistency gap found under this point: migrated plain links and buttons outside the two
`Button` "so" variants (soPrimary/soSecondary) don't carry an explicit `focus-visible:outline-so-accent`
override, so their keyboard-focus ring still resolves through the global v1 `:focus-visible` rule
(`outline-color: var(--color-ruled-blue)`, `#2f4b9a`) rather than `--color-so-accent` (`#2e5b9a`).
Severity: very low — the two hex values are nearly visually identical and both pass AA contrast on
their respective surfaces — but noted here rather than silently left out of the audit.

### 3. Theme cascade verification
Checked all 4 activation combinations via CSS specificity analysis (no live browser available in this
sandbox):
- OS light, no override → `@theme`'s `:root { }` block applies (specificity 0,1,0). Correct light values.
- OS dark, no override → `@media (prefers-color-scheme: dark) { :root:not([data-so-theme="light"]) { ... } }`
  applies (specificity 0,2,0, wins over the plain `:root` regardless of source order). Correct dark values.
- OS light, `data-so-theme="dark"` set → `:root[data-so-theme="dark"] { ... }` applies (specificity
  0,2,0, outside any media query so it always matches once the attribute is present). Correct dark values.
- OS dark, `data-so-theme="light"` set → the `:not([data-so-theme="light"])` selector inside the dark
  media query no longer matches, so nothing overrides `@theme`'s light `:root` values. Correct light values.
No ambiguous precedence in any case; the one theoretical tie (`:root:not(...)` vs `:root[data-so-theme="dark"]`,
both 0,2,0) can't actually occur in the same evaluation, and even if it could, both blocks carry
identical dark values, so there is no divergent-outcome risk. No toggle UI was built, per instruction —
the architecture supports one being added later purely by setting the `data-so-theme` attribute, with
no component-level changes required.

### 4. Font-loading architecture audit
Three separate `next/font/google` calls (`IBM_Plex_Sans`, `IBM_Plex_Sans_Devanagari`, `IBM_Plex_Mono`),
each with a distinct `variable` name, correct subsets (`latin`, `devanagari`, `latin`), and weights
matching the design reference's own Google Fonts `@import` exactly (400/500/600 for both Sans variants,
400/500 for Mono) rather than pulling the full weight range. Fallback chains are sensible
(`system-ui, sans-serif` / `ui-monospace, monospace`). No duplicate loading — grepped for repeated
`next/font/google` imports of the same family, none found. Font infrastructure was not changed to work
around the sandbox build failure, per instruction. Confirmed the Anek/Mukta font-fetch failure predates
this increment: `pnpm run build` fails with the identical "Failed to fetch [FontName] from Google
Fonts" error for all 6 fonts — the 3 pre-existing (Anek Latin, Anek Devanagari, Mukta, declared before
Increment 9 and completely untouched by it) and the 3 new IBM Plex fonts alike. Same error class,
same root cause (sandbox has no egress to fonts.googleapis.com), not a regression introduced by this
increment's font additions.

### 5. Static shell consistency audit
Checked SiteHeader, SiteFooter, PrimaryNav, MobileMenu, MobileBottomNav, CityPicker, AuthStatusLink,
and Button's two so-* variants:
- Raw/hardcoded colors: `grep -nE "#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|\[#"` across all 7 shell files plus
  `button.tsx` returned zero matches. No hardcoded colors were introduced anywhere in the migrated code.
- Legacy font declarations: grepped for `font-(anek|mukta|display|body)` and `--font-anek`/`--font-mukta`
  across the same files — zero matches. No migrated component references a v1 font token.
- Old `v2-*`/`data-theme` references: none remain (see point 1).
- Dark-mode value consistency: the `@media (prefers-color-scheme: dark)` block and the
  `:root[data-so-theme="dark"]` block carry identical values for all 13 tokens — verified line-by-line,
  no divergence.
- The one real finding is the focus-visible-outline-color gap noted under point 2 above.
Overall: the migrated shell consistently consumes the so-* semantic token system with no stray v1
references, no hardcoded values, and no inconsistent dark-mode values. No unrelated code was rewritten.

### 6. Product/domain regression check
`git diff --stat` against the pre-audit `HEAD` shows exactly the same 9 files Increment 9 touched,
now with the rename applied on top — nothing else. Confirmed no changes to: URLs/routing (`src/lib/urls.ts`
untouched), SEO metadata or JSON-LD (no `metadata`/`generateMetadata`/schema files in the diff),
Supabase queries or RLS (no `db/` or `lib/db/` files in the diff except none — `site-footer.tsx`'s
existing `listPublicAreas()` call and rendering logic are unchanged, only its CSS classes changed),
auth behavior (`auth-status-link.tsx`'s `getSession()` logic and sign-in/account routing are untouched;
only its `variant` prop's type union and the `Button` component it renders changed classes), claim
flow, admissions, school data, or database schema. `layout.tsx`'s only change is a code comment
(`font-v2-sans` → `font-so-sans` in a comment string) — the actual font-loading calls and `<html>`/
`<body>` structure are byte-identical to before the rename.

### 7. Validation results (post-rename)
- `pnpm run typecheck` (`next typegen && tsc --noEmit`): ✅ clean, no errors.
- `pnpm run lint` (`biome check .`): ✅ clean — 280 files checked, no fixes applied.
- `pnpm test` (`vitest run`): ✅ 123/123 tests passed across 16 test files.
- `pnpm run build`: not re-run after the rename beyond what's already documented — the pre-existing
  Google Fonts sandbox egress failure (point 4) is the only blocker and is unrelated to this rename;
  no visual rendering verification is claimed, per instruction, since this environment cannot render
  the site live.

### 8. Remaining risks
- The focus-visible-outline-color gap (point 2/5) — very low severity, near-identical hex values,
  both pass AA — but worth closing in a later pass by adding `focus-visible:outline-so-accent` to the
  plain migrated links, for exact consistency rather than a color coincidence.
- The v1/v2 dual-token-system period continues until Increment 10+ fully migrates page content — this
  is expected and by design, not a defect, but means two visual systems coexist in the codebase until
  that work completes.
- Live visual/responsive/dark-mode rendering has still not been verified in an actual browser in this
  sandbox (Google Fonts egress blocked); all verification to date is analytical (CSS specificity,
  computed contrast ratios, grep-based consistency checks) rather than observed.

### 9. Commit
`2f1cf37`.

**Status: awaiting Prav's product/architecture review and explicit lock decision. Increment 10 has
not been started, per instruction.**

## Increment 9 — LOCKED

Prav reviewed the pre-lock audit and approved: token naming, shell consistency, V1/V2 coexistence
scoping, domain/data/SEO/schema isolation, and validation results all accepted as-is. One follow-up
requested before lock: fix the remaining `:focus-visible` outline color gap (migrated shell links
outside Button's so-* variants were still showing the v1 `ruled-blue` outline color) to use
`--so-accent` instead, scoped to the migrated components only — not the global `:focus-visible` rule,
so unmigrated v1 pages are unaffected.

Applied `focus-visible:outline-so-accent` to all 23 remaining interactive elements across the migrated
shell: SiteHeader's brand links (mobile + desktop) and search input, PrimaryNav's nav links,
MobileMenu's hamburger/close buttons and nav links, MobileBottomNav's tabs, CityPicker's trigger button
and listbox options, and all 13 SiteFooter links (nav, tools, for-schools, city-by-state, copyright/
privacy/terms/grievance). Button's `soPrimary`/`soSecondary` variants already had this from the original
Increment 9 work. Re-ran typecheck (clean), lint (clean, 280 files), and tests (123/123 passing) after
the change — no regressions. Commit `31704cf`.

**Status: 🔒 LOCKED by Prav.**

Next: Increment 10 — Canonical School Page V2. Prav has previewed the direction (treat the supplied
school-page HTML as the binding visual acceptance spec — desktop/mobile layouts, 360px mobile behavior,
light/dark states, data states, provenance treatment, CTA hierarchy, fee presentation, section ordering,
spacing/typography, responsive behavior — with no "reinterpret as merely similar" latitude), and flagged
one architectural priority: reuse existing SchoolOye data/domain capabilities wherever they already
satisfy the design, rather than creating new tables just to match the mockup visually. Awaiting Prav's
formal Increment 10 kickoff/spec before starting any of that work.

## Increment 10 — Canonical School Intelligence Page V2

### False finding — "nearby schools" ≠ `listLocalityNeighbors()`

During the Step 2/3 mapping, the Explore subagent's audit (and my own Step 3 table, which carried the
finding forward without independently checking it) classified "Nearby & similar schools" as **Adapt**:
reuse `listLocalityNeighbors()` / `api.public_locality_neighbors` as a distance-sorted upgrade to the
existing similar-schools block. On reading the view's actual SQL during implementation, this is wrong:
`public_locality_neighbors` is a **locality-to-locality adjacency table** (which localities border which
other localities), not a school-to-school or school-to-point distance capability. It has no relationship
to individual schools at all.

**Root cause**: I carried forward the sub-agent's Step 2 audit finding into the Step 3 mapping without
checking the view's actual join logic myself. The name plausibly suggested school proximity; the schema
did not.

**Correction**: "Nearby & similar schools" has no existing distance-sorted capability to adapt. The
entity page's existing `similarSchools` (same-locality/same-board heuristic, not distance) is unchanged
in this increment. A real distance-sorted "nearby schools" feature remains a genuine future gap, not
something Increment 10 can ship by reuse. No code change resulted from this finding — it only corrects
the mapping table Prav reviewed; recorded here per this project's standing rule to preserve false
findings rather than silently overwrite them.

### False finding / reconciliation — `field_provenance` "empty/unused"

The Step 2 audit subagent's report stated `field_provenance` is "empty/unused." Prav flagged this against
an earlier-session finding of ~85k rows and required direct verification against live production data
before either claim was accepted or discarded.

**Verification** (via `mcp__Supabase__execute_sql` against project `ybevzpryuvgxclkhdjld`): the table is
**not empty** — 85,068 rows exist, from a bulk UDISE+ import snapshot. Both claims were partially right
for different reasons: the table has real data (not empty), but it is "unused" in the sense that matters
for a public UI — zero rows have any public read path (no RLS policy, no `api.*` view), and 100% of rows
have `verified_at IS NULL` and `verified_by IS NULL` — i.e. none of the 85k rows represents a verification
event; they are import metadata, not verification records. Roughly a quarter also carry
`licence_class = 'internal'`, which would not be public-safe even if a read path existed.

**Consequence**: this reconciliation is why `classifySchoolProvenance`/`classifyAdmissionProvenance`
(`src/lib/provenance.ts`) are deliberately NOT wired to `field_provenance` — doing so would require both
a new public read path (an access-control change, stopped for per this increment's rule) and would still
misrepresent import metadata as verification. The four-tier ProvenanceChip is driven only by the
`verification`/`claim` enum columns already exposed on `schools` and `admission_cycles`.

### Schema-clean implementation — commit `a2a19e5`

Implemented the portion of the Step 3 plan requiring no schema, RLS, or `api.*` view changes:

- **Shortcuts row + sticky sub-nav**: plain anchor-link (`<a href="#id">`) navigation to page sections,
  built from a `sections` array already derived from existing page data (no new query). No scrollspy or
  hide-on-scroll JS — a deliberate simplification, documented in-file, not a silently dropped requirement.
- **ProvenanceChip v1** (`src/lib/provenance.ts`, `src/components/ui/provenance-chip.tsx`,
  `src/lib/provenance.test.ts`): four-tier classifier (`school_verified` / `ops_checked` /
  `source_checked` / `unverified`) per Prav's refined semantic mapping, wired to the school header and to
  each admission-cycle row. Both call sites use columns already exposed by existing queries/views
  (`schools.claim`/`verification`, `api.public_school_admissions.verification`/`last_checked_at`) — no
  schema or view change needed for this wiring.
- **Map wiring**: `AreaMapLazy` wired into the Location section using the existing `mapPoint` data,
  previously computed but not rendered.
- **Sticky rail**: the right-hand `<aside>` made `md:sticky md:top-20`.
- **Footer trust disclaimer**: static paragraph clarifying "verified" means SchoolOye checked a fact
  against its source, not a rating/recommendation, and that SchoolOye carries no paid listings.
- **CoverageCard `variant="ledger"`** (`src/components/ui/coverage-card.tsx`): added as an opt-in prop,
  default `"buckets"` unchanged, reproducing the design's "coverage B" one-row-per-topic layout using the
  same `CoverageTopic[]` data (no new fields fabricated — the design's per-topic source/date labels are
  not rendered, since that data isn't tracked at that granularity). **Not yet activated** on the live
  entity page — the call site still uses the default `"buckets"` variant. Open item for Prav: whether to
  switch to `variant="ledger"` now or keep buckets.
- Whole page localized to so-* v2 tokens via an added `[container-type:inline-size] bg-so-bg
  font-so-sans text-so-ink` wrapper, without touching global `<body>`/`<html>` — preserves Increment 9's
  v1/v2 coexistence rule.

**Explicitly not touched**: JSON-LD (`schoolJsonLd`/`breadcrumbJsonLd`/`faqJsonLd`), auth/session logic,
any Supabase query, any migration file, any RLS policy. Verified via `git diff --stat` (exactly 5 files:
`entity-page.tsx`, `coverage-card.tsx`, `provenance-chip.tsx` [new], `provenance.ts` [new],
`provenance.test.ts` [new]) and by grep for JSON-LD/query/auth symbols.

**Validation**: `pnpm run typecheck` clean; `pnpm run lint` (biome) clean, 283 files, no fixes needed;
`pnpm test` 127/127 passing across 17 files (up from 123/16 — new `provenance.test.ts`). No regressions.

**Deliberately isolated from this commit** (per Prav's instruction not to let "schema-clean" become
"commit everything before review"): News (`school_posts`), Recent admission updates (`admission_cycles`
audit projection), and the `api.public_school_admissions` column extension (`documents_required`,
`dob_from`, `dob_to`) all require new public read surfaces and are held out as separate migration
proposals for independent review — see "Three pending migration proposals" below. No migration file was
created or applied in this commit.

**Status: schema-clean portion complete, committed (`a2a19e5`) and pushed. Awaiting Prav's review of the
three migration proposals before any of News / Recent admission updates / Admissions deepening ships.**

### Three migrations — applied

Prav reviewed the drafts above, required two corrections, and approved application:

1. **`api.public_school_news`** — applied as drafted, no changes requested.
2. **`api.public_admission_updates`** — revised before application: dropped `form_url`/`new_form_url`
   from the allowlist and the diff computation entirely (V1 allowlist is now `status`, `opens_on`,
   `closes_on`, `results_on` only — extendable later, explicitly); wrapped every date extraction in
   `NULLIF(after->>'field', '')::date` so a malformed/empty string in the audit JSON can't fail the
   whole view.
3. **`api.public_school_admissions`** — corrected before application. The first draft placed
   `dob_from`/`dob_to`/`documents_required` before the existing computed `days_to_close` column, which
   Postgres itself rejected on apply (`cannot change name of view column "days_to_close" to "dob_from"`
   — `CREATE OR REPLACE VIEW` only allows appending new output columns after the *last* existing one, not
   splicing them in earlier). Re-verified the live view definition via `pg_get_viewdef` immediately
   before writing the corrected migration (byte-identical to `db/views/020_public_school_admissions.sql`
   — no drift), then appended the three new columns after `days_to_close` instead. This is recorded here
   because the first draft's claim ("adds columns, doesn't remove, rename, or reorder any existing
   ones") was not accurate for the SQL as first written — worth keeping as a reminder that "additive"
   claims need to be checked against Postgres's actual view-replacement rules, not just eyeballed.

All three applied via `mcp__Supabase__apply_migration` against project `ybevzpryuvgxclkhdjld`. Post-apply
verification: `pg_get_viewdef` on all three matches the intended SQL exactly; `anon`/`authenticated`
SELECT grants confirmed on all three via `information_schema.role_table_grants`; Supabase security
advisor shows no new findings attributable to any of the three views. `pnpm run typecheck`/`lint`/`test`
all clean (127/127) — expected, since no application code changed in this step.

**Data-completeness findings surfaced by the representative queries** (not defects in the migrations):
- `school_posts` has **zero rows** in production — the table exists (from the 26 Sep migration) but
  nothing has been authored into it yet, so News has no real content to render until schools/ops start
  posting.
- Of the 12 `admission_cycles` rows carrying `dob_from`/`dob_to`/`documents_required` data, only 2 have
  a non-null `school_id` at all (the rest are unlinked import rows, likely from an NVS/JNV batch not yet
  matched to a `schools` row) — and neither of those 2 linked rows has that data populated. So the
  Admissions-deepening UI (eligibility checker) has real plumbing but no real school currently has data
  to show through it in production.

No migration file was written under `supabase/migrations/` for these three changes yet — they exist only
as applied Postgres objects (via the Supabase MCP tool) at this point; a repo migration file capturing
them can be added as a follow-up if Prav wants the repo's migration history to reflect this.

**Status: three migrations applied and verified. Proceeding to the three previously-blocked UI pieces
(News, Recent admission updates, Admissions deepening), reported separately below per Prav's request to
audit the new public-data contracts distinctly from their UI consumers.**

### UI consumers of the three migrations — News, Recent admission updates, Admissions deepening

Reported separately from the migration-application entry above, per Prav's request to be able to audit
the new public-data contracts distinctly from their UI consumers. Commit `e9cf9d4`.

- **`db/views/020_public_school_admissions.sql`, `095_public_school_news.sql` (new),
  `096_public_admission_updates.sql` (new)** checked into the repo as source-of-truth, matching what's
  now live — plus three matching files under `supabase/migrations/` (`20260928175050`, `20260928175100`,
  `20260928175119`), since the migrations were applied directly via the Supabase MCP tool rather than
  through a checked-in migration file first. `020_...` now documents the Postgres column-order
  constraint in its header so nobody re-trips it on a future addition to that view.
- **Contracts**: new `PublicSchoolNews` (`src/contracts/public-school-news.ts`) and
  `PublicAdmissionUpdate` (`src/contracts/public-admission-updates.ts`), mirroring their views exactly;
  `PublicSchoolAdmission` extended with `dob_from`/`dob_to`/`documents_required`.
- **Data access** (`src/lib/db/public-adapter.ts`): `getPublicSchoolNewsBySchoolId`,
  `getRecentAdmissionUpdatesBySchoolId` (defaults to 5 most recent) — both read only their respective
  `api.*` view, no new query logic beyond what the views already scope.
- **News section**: renders title/body/date/source link for approved posts; a `press`-kind post gets a
  small "Press" badge. Placed as an "answers" section (content about the school), before the
  coverage/trust block — a placement call made without re-walking the full design-block order in this
  pass, flagged in-code and here in case the reference design places News elsewhere.
- **Recent admission updates section**: placed directly after Admissions (same subject). Renders
  "Admission cycle added"/"Admission updated" + academic year/class + the new status (if changed) + date.
- **Admissions deepening**: `EligibilityChecker` embedded inside the Admissions section, built from
  cycles that have both `dob_from` and `dob_to` — reuses the exact component and prop shape already
  shipped on `exams/[slug]/page.tsx` (`toEligibilityCycles`'s logic copied, not modified) with no changes
  to that component itself. Uses `${academic_year}-${class_code}` as the per-cycle key, matching the
  key the admissions list already uses — `api.public_school_admissions` has no per-cycle id column
  (unlike the exams view's `cycle_id`), and this key is already this page's de-facto unique identifier
  for one school's admissions list.

**All three render nothing when their data is empty** — no permanent placeholder, consistent with the
"Events gets no visible UI unless there's real content" principle. Given the data-completeness findings
above (empty `school_posts`; only 2 admission cycles even linked to a school, neither with DOB data),
none of the three will visibly render on any real production school page today — this is expected, not a
bug, and will show up naturally as News gets authored and admissions data gets more complete DOB/document
fields.

**Validation**: `pnpm run typecheck` clean; `pnpm run lint` clean (285 files, two new contract files);
`pnpm test` 127/127 (unchanged — no new pure-logic to unit-test; this is UI wiring over already-tested
`provenance.ts`/`eligibility.ts`). `git diff --stat` confirms only the expected 12 files
(2 updated `db/views` + 1 new `db/views` x2 + entity-page + 3 contract files + adapter + 3 migration
files) — no unrelated touches.

**Status: Increment 10's three previously-blocked UI pieces are now live in code, on top of the
reviewed-and-applied migrations. No further schema/RLS changes were needed to ship them.**

## Increment 10R — Canonical Page Acceptance Remediation

Direct response to the Increment 10 audit findings (`/school/vivekanand-academy` vs. the binding V2
design). Scoped exactly to remediation per Prav's instruction — not a redesign, no new tables, no
Events/News-hub infrastructure, Fees and advanced sticky-nav interaction explicitly stay deferred.
Commit `10153d3`.

1. **URL normalizer** (`src/lib/external-url.ts` + `external-url.test.ts`, 6 tests) —
   `normalizeExternalUrl()` adds `https://` to a bare-domain website value before it's used as an
   `href` or JSON-LD `sameAs`. Applied at all three call sites in `entity-page.tsx` (quick-action
   pill, Contact card link, JSON-LD `sameAs`). Confirmed against live production: 1,986 of 2,255
   published schools with a website on file (88%) had no scheme — this fixes a pre-existing,
   site-wide bug, not something Increment 10 introduced.
2. **Shortcuts/sub-nav order** — the `sections` array (shared by both the shortcuts row and the
   sticky sub-nav) is reordered to match the page's actual DOM order exactly (Facts before
   Admissions, matching how the page has always rendered — the array had them reversed).
3. **Claim card** (`src/components/ui/claim-card.tsx`) — wraps the existing, unchanged
   `ClaimStatusLink` component/claim flow in a real card, per design C16/D2 ("Claim card moves to the
   rail" for a sparse/unclaimed record, "after Fees on mobile"). Rendered twice — after Admissions on
   mobile (`md:hidden`, since Fees stays deferred and that's where Fees would have been) and at the
   top of the right rail on desktop (`hidden md:flex`) — only when `claim === "unclaimed"`. No new
   claim logic; same membership/pending/rejected states `ClaimStatusLink` already handles.
4. **Sparse-data Updates wording** (`src/lib/admission-updates.ts` + `admission-updates.test.ts`, 4
   tests) — `describeAdmissionUpdateChanges()` now names every changed allowlisted field
   (status/opens_on/closes_on/results_on), not just status. Previously a cycle whose only change was
   a date shift rendered a content-free "Admission updated" line with nothing saying what changed.
5. **News repositioned** — moved from just-before-Coverage (near the bottom) to directly after Recent
   admission updates, grouping the page's "what's currently happening" content together. This is
   explicitly *not* the design's unified "What's happening card" (C19) and does not build `/events` or
   `/news` hub routes — Events stays fully out of scope. It only moves the existing, unchanged News
   section to a position consistent with the canonical-page hierarchy, per Prav's explicit instruction
   to resolve the positioning question without building deferred infrastructure.

**Confirmed deliberately unchanged, per instruction:** Fees (still entirely absent, no empty state —
deferred); sticky sub-nav's hide-on-scroll/grouped-items-plus-More/active-tracking/fade-edge behavior
(still plain sticky anchor links, self-documented as deferred).

**No migration, RLS, or table changes** — the audit's #8 constraint held throughout; every fix here is
pure application code reusing existing tables/views/flows.

**Validation**: `pnpm run typecheck` clean; `pnpm run lint` clean (290 files); `pnpm test` **137/137**
(up from 127 — 10 new tests: 6 for `normalizeExternalUrl`, 4 for `describeAdmissionUpdateChanges`).
`git diff --stat`: one file modified (`entity-page.tsx`) + 4 new files (2 lib modules + 2 test files) +
1 new component — no migration files, no schema files touched.

**Verification method note**: this sandbox's outbound network is blocked to the production Supabase
project, so `next dev` here cannot render a live page (same constraint hit during the audit) — no pixel
screenshots were possible. Verification was done by (a) reading the resulting DOM order and conditional
logic directly against real production data for each required scenario (sparse/unclaimed: vivekanand-
academy; admissions data + unschemed website: dav-public-school; claimed + schemed website:
rk-international-school-bhankrota; no website: sd-senior-secondary-school), (b) the two new unit-tested
pure functions, and (c) Tailwind breakpoint semantics (`md:` = 768px, so 360px/1440px resolve
unambiguously from the classes used) rather than an actual rendered screenshot at either width.

**Status: remediation complete, committed and pushed. Increment 10 remains UNLOCKED pending Prav's
review of this remediation, per explicit instruction not to lock until reviewed.**
