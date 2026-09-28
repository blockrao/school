# School entity page v2 — architecture & sequencing roadmap

Status: **proposed, awaiting sign-off on Phase 0 before any implementation begins.**

Source of truth for the target design: `docs/spec/school-entity-page-v2-design.html` (committed
`3af9412`). This roadmap translates that design into buildable, dependency-ordered phases. Each
phase follows the existing discipline: build → inspect → validate → lock → next phase. Nothing
past Phase 0 starts until the phase before it is locked.

Grounding: this roadmap is based on the *actual* current implementation (`entity-page.tsx`) and
the *actual* live schema (`supabase/migrations/`), not on other spec docs, several of which are
known to be stale (see `docs/decisions.md`, retired `911910b`).

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
parents") that the user can tap for source + change history. This is the same idea as
`field_provenance`, generalized and finally surfaced in the UI. It has to exist before most other
modules can be built *as designed* — building modules first and bolting provenance on after would
mean redoing them. This is why it's Phase 0, not a later polish pass.

The design also introduces **`school_notices`**-shaped documents (admission notice, fee circular,
transport notice) as the mechanism by which a school actually publishes updates. Several modules
(admissions, fees, infrastructure certificates) read their "School-provided" data from a notice
like this. This is also the concrete shape of the "school wants to update its info" self-service
flow — so it belongs in Phase 0 too.

## Phase 0 — Provenance + notices infrastructure (foundational)

**Public:** provenance chip component (label + tap-to-expand source/date/history), used wherever a
fact is shown. No new visible module yet — this rides along inside Phase 1's decision strip.

**Ops:** notices review queue (approve/reject a school-submitted notice before it goes live);
existing verification workflow extends to per-notice `verified_by`/`verified_at`.

**School self-service:** a "Publish an update" flow — school uploads/enters a notice (type:
admission | fee | transport | safety | other), the fact fields it affects, effective dates. This
is the first real school-facing write path into the product (today: none exists — everything
schools have is a "Claim this page" stub).

**Schema (proposed, needs your go before any migration):**
- `school_notices`: `id, school_id, notice_type enum, title, body, file_url, session_year, issued_at, submitted_by, submitted_at, review_state enum(pending|approved|rejected), reviewed_by, reviewed_at, created_at`
- Extend `field_provenance` with the columns already scoped in `data-requests.md` R-01 (`review_state`, `observed_at`, `method`, `note`) — since we're finally building the thing that needs them.

**Depends on:** nothing. **Blocks:** everything else.

## Phase 1 — Identity, decision strip, coverage card, updates timeline

Uses only data that already exists (`claim`, `verification`, `about_en`, board/grades/management),
plus Phase 0's provenance chip.

**Public:**
- Header/identity band, 3 states (Verified·school-managed / School-claimed·pending / Unclaimed) — design C1–C3.
- "At a glance" decision strip — 6 fixed semantic slots (Admissions, Annual fee, Entry classes, Student–teacher ratio, Board result, Location), each rendering real data or a graceful "Not yet verified" fallback per slot (design C4–C5). Most slots have no backing data yet (fee, ratio, board result) — they render sparse until Phases 2–4 land.
- Coverage card — recommend variant **A** ("record status": count + sources + missing-topics list) as the simplest to compute and maintain; B and C are presentational alternatives of the same underlying data, not separate work.
- Updates timeline — derived from existing `field_provenance`/`audit_log` timestamps, filtered to a public-safe subset of changes.

**Ops:** none new — this phase surfaces existing fields, doesn't add editable ones.

**School self-service:** the "Claim this page" flow gets a real destination (today it's a dead-end CTA per the gap-list finding) — needs its own small scoping pass on what "claim" actually requires (official email domain match? affiliation letter upload via Phase 0's notice mechanism?).

**Depends on:** Phase 0 (provenance chip). **Blocks:** Phase 7 (comparison mode reuses the decision strip).

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

## Recommended immediate next step

Lock **Phase 0** as the next increment: the `school_notices` table, the `field_provenance` R-01
column additions, the provenance-chip UI primitive, and the notice-review ops queue. This is the
smallest slice that (a) doesn't require deciding fees yet, (b) gives schools their first real
write path instead of a dead-end claim button, and (c) everything else in this roadmap depends on
it.

Waiting on your sign-off before writing any migration or code against this phase.
