# School entity page v2 — architecture & sequencing roadmap

Status: **in progress. Increment 4 (claim flow, `914614f`) and Increment 5 (identity band +
decision strip, `9de46f6`) are locked** — see `docs/ops/implementation-log.md` for what actually
shipped and what was found along the way. This doc's Phase 0 and Phase 1 sections below have been
corrected to match those findings (see the "2026-09-28 correction" notes inline); Phases 2–7 are
still as originally proposed and unvalidated against live data — treat them as a starting sketch,
not a locked plan, until each is actually scoped the way Phase 1 just was.

Source of truth for the target design: `docs/spec/school-entity-page-v2-design.html` (committed
`3af9412`). This roadmap translates that design into buildable, dependency-ordered phases. Each
phase follows the existing discipline: build → inspect → validate → lock → next phase.

Grounding: this roadmap is based on the *actual* current implementation (`entity-page.tsx`) and
the *actual* live schema (checked directly against the live Supabase project — migration files
alone have been shown to drift from what's actually live, e.g. `admission_cycles`' provenance-v2
columns below), not on other spec docs, several of which are known to be stale (see
`docs/decisions.md`, retired `911910b`).

## Why sequencing this way

Every module in the v2 design implies three surfaces:
1. **Public page** — what a visitor sees.
2. **Ops admin** — how staff manage/verify the underlying data.
3. **School self-service** — how a school registers, claims, or updates its own record.

Building the public UI alone for most modules would just be a fancier static mock — the value is
in the data pipeline behind it. So phases are ordered by what unlocks the most downstream work,
not by visual prominence.

## Cross-cutting mechanism found in the design (not a module, a primitive)

Nearly every fact on the page carries a **provenance chip**: a short attribution line
("School-provided · Source verified", "Stated by the school", "Not yet verified", "Reported by 7
parents") that the user can tap for source + change history.

> **2026-09-28 correction (locked earlier this session, reconfirmed by Increment 5's live-schema
> check):** this is **not** the same idea as a generalized `field_provenance` extension, and does
> not need one. Provenance in this codebase is genuinely domain-specific — every trust-bearing
> table already carries (or can carry) its own shape: `fee_items.verification`,
> `school_media.approved`, and — checked live during Increment 5 — `admission_cycles` *already has*
> `source_type`, `verification_status`, `last_checked_at`, `verified_at`, `verified_by` in
> production today, with no migration file for them found locally (drift between the live DB and
> committed migrations — worth a separate look, not blocking). The "provenance chip" is a **shared
> UI convention that normalizes whatever shape each table already has** into one display
> component, not a new data layer underneath them. `src/lib/decision-strip.ts` (Increment 5) is the
> first real implementation of that normalizing pattern — `domain data → normalized display
> value/status → presentation slot` — and should be the template for the provenance chip whenever
> it's built, rather than a new `field_provenance` migration. The "extend `field_provenance` with
> R-01 columns" line below is stale; do not build it.

The design also introduces **`school_notices`**-shaped documents (admission notice, fee circular,
transport notice) as the mechanism by which a school actually publishes updates. Several modules
(admissions, fees, infrastructure certificates) read their "School-provided" data from a notice
like this. This is also the concrete shape of the "school wants to update its info" self-service
flow. **This part is still accurate and still unbuilt** — confirmed by Increment 5's live check
that `admission_cycles` has zero school-linked rows and `fee_items`/`school_media` have zero rows
at all: schools genuinely have no real write path into the product today beyond the claim flow.

## Phase 0 — Notices infrastructure (foundational for self-service; provenance UI is not blocked on it)

**Public:** provenance chip component — a shared *display* convention (see the correction above),
built by normalizing whatever verification/source shape each domain table already has, the same
way `src/lib/decision-strip.ts` already does for the decision strip's slots. Not blocked on any
schema change; could in principle be built standalone, without `school_notices`.

**Ops:** notices review queue (approve/reject a school-submitted notice before it goes live);
existing verification workflow extends to per-notice `verified_by`/`verified_at`.

**School self-service:** a "Publish an update" flow — school uploads/enters a notice (type:
admission | fee | transport | safety | other), the fact fields it affects, effective dates. This
is the first real school-facing write path into the product (today: none exists — everything
schools have is the claim flow, completed in Increment 4).

**Schema (proposed, needs sign-off before any migration):**
- `school_notices`: `id, school_id, notice_type enum, title, body, file_url, session_year, issued_at, submitted_by, submitted_at, review_state enum(pending|approved|rejected), reviewed_by, reviewed_at, created_at`
- ~~Extend `field_provenance` with the columns already scoped in `data-requests.md` R-01~~ — **stale, do not build**, see the correction above.

**Depends on:** nothing. **Blocks:** the school-self-service half of Phases 2–4 (schools actually
publishing admission/fee/facility updates) — but **does not block** the public-page provenance-chip
UI itself, which can be built directly over existing per-table columns whenever it's picked up.

## Phase 1 — Identity, decision strip, coverage card, updates timeline

**Status: partially shipped.** Identity band (Increment 5) and the decision-strip presentation
framework (Increment 5) are locked and in production. Coverage card and updates timeline are still
unbuilt — deliberately held out of Increment 5 to keep it small, per Prav's explicit scope lock.

Uses only data that already exists (`claim`, `verification`, `about_en`, board/grades/management).
**Correction:** does not depend on Phase 0 after all — Increment 5 built and shipped without it,
confirming the decoupling noted in Phase 0's correction above.

**Public:**
- ✅ **Shipped (Increment 5):** header/identity band, 3 states (Verified·school-managed /
  School-claimed / Unclaimed) — design C1–C3. `src/lib/identity-band.ts`.
- ✅ **Shipped (Increment 5), framework only:** "At a glance" decision strip — 6 fixed semantic
  slots (Admissions, Annual fee, Entry classes, Student–teacher ratio, Board result, Location).
  `src/lib/decision-strip.ts` + `src/components/ui/decision-strip.tsx`. As of this increment, only
  **Location** and **Entry classes** render real data — the other four render "Not yet verified"
  honestly, not because of a UI limitation but because the backing data/read-path genuinely doesn't
  exist yet (see the Data-enablement backlog below and `docs/ops/implementation-log.md`'s Increment
  5 scoping entry for the full finding per slot). Filling in the remaining four slots is
  **data-enablement work, not a UI change** — do not scope it as "finish the decision strip."
- ⬜ **Not built:** coverage card — recommend variant **A** ("record status": count + sources +
  missing-topics list) as the simplest to compute and maintain; B and C are presentational
  alternatives of the same underlying data, not separate work.
- ⬜ **Not built:** updates timeline — derived from existing `field_provenance`/`audit_log`
  timestamps, filtered to a public-safe subset of changes.
- ⬜ **Backlogged, presentation-only (Prav's "Canonical Page Structural Refactor" list, captured in
  the implementation log's Increment 5 lock entry):** integrate the photo into the identity header
  as one unit rather than a separate pre-header block; finalize above-the-fold hierarchy; refine
  identity banner wording/visual treatment; decision strip visual polish; section ordering; mobile
  information hierarchy; conditional module rendering; canonical answer-first section structure.

**Ops:** none new — this phase surfaces existing fields, doesn't add editable ones.

**School self-service:** the "Claim this page" flow now has a real destination — **done in
Increment 4** (states A–D: duplicate-pending block, pending/rejected visibility, member CTA).

**Depends on:** nothing (see correction above). **Blocks:** Phase 7 (comparison mode reuses the
decision strip).

## Phase 2 — Admissions module

**Public:** cycle status + key-dates timeline, entry classes/seats/age table, "check age eligibility" tool, application process steps, documents checklist (design lines ~497–548).

**Ops:** admin UI to manage/correct admission-cycle data ingested from a notice.

**School self-service:** submit an admission notice (via Phase 0's `school_notices`) that populates dates, entry classes, seats, age rules, and the documents checklist — this is the actual "school wishes to update info" flow for admissions specifically.

**Schema:** likely a `school_admission_cycles` table (session_year, entry_class, seats, min_age, process_steps, documents_required) sourced from a notice — needs its own short design pass, not assumed here.

**Depends on:** Phase 0.

## Phase 3 — Fees module (the previously-deferred decision)

The v2 design actually resolves the fee-architecture conflict you and the repo disagreed on
earlier: **it doesn't pick a primary.** When school-provided and parent-reported figures agree
(or only one exists), it shows one number. When they disagree, it shows both side by side, in
identical neutral styling, explicitly labeled "Two figures," and states plainly that SchoolOye
"does not choose between them" (design lines 599-604, 2133-2160). That's a real, adoptable answer
to the conflict you flagged in your own D3/D-013 note vs. your stated preference — worth
confirming explicitly before I build to it, since it overrides both prior positions.

**Public:** per-class fee table (tuition/annual/one-time/transport/other), yearly totals by class,
3-year history with % change, the fee-disagreement dual-card view, compact table toggle.

**Ops:** manage/approve fee circulars and structured fee entries.

**School self-service:** submit a fee circular (Phase 0 notice) + structured per-class fee entry form.

**New subsystem:** parent-reported fee crowdsourcing (aggregation of parent-submitted figures into
a range) — this is a meaningfully separate piece of work from the school-side fee entry and could
be its own sub-phase (3b) after school-side fees (3a) are working, rather than built simultaneously.

**Schema:** populate/extend `fee_items` (exists, currently 0 rows, unused); new table for
parent-reported fee submissions with basic anti-abuse/one-per-parent constraints (needs its own
scoping — this is the closest thing to a "reviews" trust problem in the fees module).

**Depends on:** Phase 0. **This is the single largest phase** — recommend splitting into 3a (school-provided fees) and 3b (parent-reported + disagreement UI) as separate locked increments.

## Phase 4 — Academics, infrastructure & safety, staff

**Public:** board results by year/class, staff counts by category (PGT/TGT/PRT/counsellors/special educators), streams/languages, infrastructure facts, safety certificates with expiry status.

**Ops:** manage these records (mostly annual-update-cadence data).

**School self-service:** submit board results / certificates / staff counts (via Phase 0 notices, `notice_type: safety` etc., or a dedicated structured form).

**Schema:** `school_facilities` (exists, 0 rows, unused) needs real data; new tables for board results by year and safety certificates with expiry dates — neither exists today.

**Depends on:** Phase 0.

## Phase 5 — Events & SchoolOye News

**Public:** "What's happening" feed (school-hosted events + News mentions), "All events in {locality}" link.

**Ops:** content pipeline — curating events, tagging News articles to schools.

**School self-service:** TBD — may start ops-only (staff-curated) with school self-service deferred to a later sub-phase, since this is content-editorial rather than factual-record data.

**Schema:** new `events` table; News-article-to-school tagging (join table or array column).

**Depends on:** nothing structurally, but low priority relative to trust-critical modules (admissions/fees) — recommend sequencing after Phase 4 regardless of technical independence.

## Phase 6 — Parent voice (reviews)

**Public:** verified-parent reviews shown in full, with a school-response thread.

**Ops:** moderation queue, parent-verification mechanism (confirming a reviewer is an actual parent at the school — the hardest trust problem in this phase).

**School self-service:** respond-to-review flow only (schools don't author reviews).

**Schema:** new reviews subsystem entirely — parent identity/verification, review records, response records. This is the most architecturally novel phase (nothing today resembles it) and probably deserves its own dedicated scoping pass before estimation, not just a schema sketch here.

**Depends on:** nothing structurally. Recommend building last — highest new-trust-surface risk, lowest reuse of what earlier phases build.

## Phase 7 — Comparison mode

**Public:** slot-aligned side-by-side comparison of 2+ schools' decision strips (design X1).

**Depends on:** Phase 1 (decision strip) being built and stable. Nothing to design freshly here — it's a layout mode over Phase 1's component.

---

## Data-enablement backlog

Captured verbatim from Prav's Increment 5 lock review (also recorded in
`docs/ops/implementation-log.md`). Each is an independent data/product capability — **do not solve
one merely to populate a currently-sparse decision-strip slot**; each stands on its own product
merit:

- Establish a public `api.*` read path for school media (today: table exists, 0 rows, no view).
- Establish an appropriate public read path for fee data (today: `fee_items` exists, 0 rows, no view).
- Establish school-linked admission-cycle data (today: 10 `admission_cycles` rows, all
  `school_id IS NULL` — exam-linked, not school-linked).
- Eventually establish a school-verification state beyond "claimed" (today: 0 rows anywhere are
  `verification = 'school_verified'`).
- Board/result data source (today: no table exists anywhere in the schema).
- Student–teacher ratio data source (today: no table exists anywhere in the schema).

## Recommended next increment — open, not yet chosen

Three independent tracks are now backlogged, none scoped or estimated yet:
1. **Finish Phase 1** — coverage card + updates timeline (public-page work, no new schema, reuses
   existing `field_provenance`/`audit_log` timestamps as originally planned).
2. **Canonical Page Structural Refactor** (see Phase 1's backlog list above) — presentation-only,
   no new data needed, addresses the photo/header-hierarchy note from the Increment 5 lock review.
3. **Data-enablement** (see backlog above) — pick one item (most likely candidate: `school_notices`,
   since it's the one piece that unblocks schools actually publishing real data, which in turn is
   what would let admissions/fees/media move off "Not yet verified") and scope it properly before
   any migration, the way Phase 1 was scoped before Increment 5.

Not recommending one over the other here — that's a product call for Prav, not an engineering
default.
