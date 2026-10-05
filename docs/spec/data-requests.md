# Data requests — table changes for the data session

**Status:** open queue · **Updated:** 27 Sep 2026 · **Decisions:** D-073, D-091
**Canonical location:** this file. Replaces `docs/handoff/db-agent-requests.md` (archived).

The data session owns table DDL until the data repo retires (D-091). Every additive change a
feature spec needs is listed here once, in build order, with the spec that owns it. All items are
**additive** (new tables, nullable/defaulted columns, indexes, new enum values). Anything
destructive is listed separately and needs Prav's explicit yes (D-073).

Types match the live schema: `schools.id uuid`, `sources.id smallint`, `consents.id bigint`,
`field_provenance.id bigint`, `profiles.user_id uuid`. `admission_status` already contains
`postponed` and `cancelled` (the generated `src/lib/db/types.ts` is stale — run `pnpm db:types`).

## Build order

| # | Change | Needed by | Spec |
|---|---|---|---|
| R-01 | `field_provenance`: `observed_at`, `scope_key`, `method`, `review_state` (candidate/accepted/rejected/superseded; not `review_status`, which clashes with the existing `review_status` enum), `reviewed_by`, `reviewed_at`, `note` + 2 indexes | M1 (15 Oct) | `school-entity-page.md` §6.1 |
| R-02 | `sources.source_group`; new tables `field_families`, `source_precedence` + seed rows | M1 | `school-entity-page.md` §3, §6.1 |
| R-03 | `admission_cycles`: `test_on`, `interaction_on`, `fee_deposit_by`, `class_label_school`, `rte_seats`, `rte_source_id`, `next_check_on` (+ partial index), `previous_cycle_id`, `announced_at`. **No new `rolling` enum value** — rolling = `open` with `closes_on is null` | M1 | `school-entity-page.md` §5.1, `ops-console.md`, `admissions-tracker.md` |
| R-04 | `schools`: `campus_label`, `aliases`, `index_state`, `index_state_reason`; `search_key` (+ `pg_trgm` GIN index) | M1 (index_state), M2 (search) | `school-entity-page.md` §6.1, `discovery.md` §4 |
| R-05 | `update_reports`: `kind` (check: `wrong_fact`, `new_info`, `closed_or_moved`, `other`, `request_update`), `class_code`, `academic_year`, `field`, `device_hash` | M1 | `admissions-tracker.md` §4 |
| R-06 | `alert_subscriptions`: `unsubscribe_token` (unique), `locality_ids`; `alert_deliveries`: `channel`, `language` + dedupe unique index; table `alert_runs` | M1 | `admissions-tracker.md` §4 |
| R-07 | `ops_tasks`: unique partial index on open tasks per (`kind`, `ref_table`, `ref_id`) | M1 | `ops-console.md` §4 |
| R-08 | `organizations`, `school_organizations` | M3 | `school-entity-page.md` §4.2 |
| R-09 | `school_contacts`, `school_links` | M3 | `school-entity-page.md` §4.5 |
| R-10 | `fee_items` additions (`head`, `variant`, `mandatory`, `refundable`, `basis`, counts, `evidence_document_id`, `effective_from`); `fee_reports`; `fee_responses`; `school_documents`; `consent_purpose` value `fee_report`; private bucket `fee_evidence` | M2 (1 Nov) | `school-entity-page.md` §5.2–§5.3 |
| R-11 | `claim_challenges`; `school_claims.provisional`, `decision_reason`; `school_members.status`; `enquiries.read_at` | M2 | `school-portal.md` §4 |
| R-12 | `seat_status`: `review`, `confirmed_by`, `pending_status`, `pending_range_label`, `pending_reported_at`, `published_by_admin_at` | M2 | `openseat.md` §4 |
| R-13 | `exam_cycle_milestones.kind`; exam `hi_ready` | M2 | `exams.md` §4 |
| R-14 | Concierge: `refunds`; `invoices.order_id`; `doc_type` value `id_proof_parent`; `application_orders.paid_confirmed_by` (school picks reuse `applications` via a function — no table) | M2 | `concierge.md` §4 |
| R-15 | `school_rankings`: `publisher`, `source_url` (if absent) | M1 (D-088 attribution) | `discovery.md` §4 |
| R-16 | `conversation_blocks`; optional `task_type` value `moderate_message` | before any DM promotion (D-105) | `teachers.md` §4 |
| R-17 | P2: `seat_requests` (`consent_id bigint references consents(id)`), `consent_purpose` value `seat_request` | P2 | `openseat.md` §4 |
| R-18 | After D-095 (WhatsApp provider): `whatsapp_messages` | when provider chosen | `ops-console.md` §3 |

The full SQL for R-01–R-03 and R-08–R-10 is in `school-entity-page.md` §6.1; for the others, in
the owning spec's §4. When the data session applies an item, mark it here with the date and the
migration file name, then run `pnpm db:types` and `pnpm verify:views`.

## Ingestion / source-coverage requests (not a schema change — no new columns needed)

| # | Request | Why | Context |
|---|---|---|---|
| I-01 | A real contact-info source for Delhi private schools (phone and/or website per school) | 1,109 of 1,179 published Delhi schools (94%) have zero contact channel, so they fail the L2 indexability gate and never appear in the sitemap — by far the single biggest indexability gap on the platform (every other city is 85–98% indexable; Delhi is 6%) | Checked 5 Oct 2026: UDISE+ ingestion in this repo never covered Delhi at all (0 matches for any Delhi school). The only Delhi-specific source today, `delhi_doe` (EduDel's admission-criteria list), has no phone/email/website field in its schema — it was never going to carry this. `saras_archive` matches 144 Delhi schools but only 10 have anything in "website," and all 10 are either the Delhi Directorate of Education's own department homepage (`edudel.nic.in`, not the school's own site) or a literal placeholder (`xyz.com`) — not usable, not promoted. Needs a genuinely new source (e.g. a Delhi school directory that actually carries phone/website per school) — not a column addition or a re-match of data we already have. |

## Owned by this repo (not the data session)

Views, `api` functions (D-102), grants, RLS, storage policies and audit triggers that go with
these tables are written in this repo (`db/views/`, `supabase/migrations/`) — see each spec's §4.

## Destructive — need Prav's explicit yes (D-073)

| # | Change | Why | Spec |
|---|---|---|---|
| X-01 | Migrate stored `admission_status = closing_soon` rows to `open` (status becomes derived) | D-087, IST derivation | `school-entity-page.md` §6.4 |
| X-02 | Drop legacy `verification` on `schools`, `admission_cycles` (and `fee_items`, replaced by `basis`) after all reads use `source_type` + `verification_status` | N-03 | `school-entity-page.md` §6.4 |
| X-03 | Merge `correction_requests` into `update_reports`, then drop it (currently empty) | one intake | `ops-console.md` §4 |
| X-04 | Stop reading `phone[]`/`email[]` for display after the `school_contacts` backfill | R-09 | `school-entity-page.md` §6.4 |
| X-05 | Storage policy so ops can open concierge vault files (RLS on personal data) | fulfilment | `concierge.md` §2 |
| X-06 | `delete_my_account()` anonymises orders/invoices instead of hard-deleting, once real payments start | tax records | `concierge.md` §4 |
| X-07 | Restore the grants `authenticated` needs on `school_claims` / `school_members` for ops approval (if `20260925111631` is live, approvals fail silently) — REVOKE/GRANT on a table with personal data | P0 bug | `school-portal.md` §2 |
