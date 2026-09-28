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
