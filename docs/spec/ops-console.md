# Ops Console — Developer Spec

**Status:** draft (§2 reflects shipped code; §3 onward not yet approved) · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** N-03, N-06, N-10, N-14, D-003, D-013, D-014, D-024, D-025, D-026, D-028, D-060, D-061, D-062, D-065, D-066, D-073, D-084, D-087, D-091, D-095, D-100, D-103 (see `docs/decisions.md`) · **Guidelines:** `docs/spec/data-and-trust.md` (D-023), `docs/ops/data-retention.md`
**Consistent with:** School Entity Dev Spec §3 (verification), §5.3 (fee reports), §10 (ops tooling). Where this file and that spec differ, decisions.md wins.

## 1. Purpose and scope

The central office runs SchoolOye from one internal console at `/ops` (D-003). Every fact that can
be wrong passes a person here before parents see it (N-14, D-025, D-028). This file covers the
data desk (queues, record editor, calls), support (WhatsApp inbox), and the staff and audit
tooling the other desks share.

**In scope**
- Verification queues: AI-extracted notices, parent and school updates, new records, claims,
  corrections, moderation (parent fee reports with redaction, school edits, disputes, news posts).
- School record editor with provenance and observations.
- Call queue `/ops/calls` driven by `next_check_on` (D-065).
- Seats, posts, localities, audit log, staff roles, coverage dashboard, SLAs.
- WhatsApp shared inbox (Product Spec K5).
- The orders board, as a link into the concierge spec (`concierge.md`). This file does not
  specify order handling.

**Out of scope**
- Sales CRM / pipeline (K7). `sales_accounts` and `sales_activities` exist, but the UI is P1 and
  lives in the school-success spec.
- Data-quality console. Deferred until open `data_quality_flags` exceed what `/ops` clears
  weekly (decisions.md deferred table).
- Parent reviews moderation. Reviews are P2 (D-009).
- Automated change monitor job. It belongs to the data repo (entity spec §10.4). This file
  only consumes its `verify_notice` tasks.

## 2. Current state (verified against the repo on 27 Sep 2026)

All routes are `requireStaff()`-gated (`src/lib/db/ops.ts`, which calls the `is_staff()` RPC) and
set `noindex`. `robots.ts` disallows `/ops`. Ops reads and writes raw tables through the session
client under staff RLS. This is the `/ops` write path that `docs/spec/data-and-trust.md` assigns to this
repo, and it is not an `api.*` read. There is no design file; every screen is built from
`src/components/ui` tokens (`docs/screen-map.md`, "Ops Verification Queue").

| Route | What it does today | Gaps |
|---|---|---|
| `/ops` (`src/app/ops/page.tsx`, `src/lib/db/ops-dashboard.ts`) | Queue cards with pending counts | No coverage metrics, no SLA ages |
| `/ops/tasks` | `ops_tasks` board: create, assign, claim, change status; all 8 `task_type` kinds | **Nothing creates tasks automatically.** Every row is hand-made |
| `/ops/schools`, `/ops/schools/[id]` | Search by `name_en`, filter by status and verification; the editor writes `schools.*` | Edits only the legacy `verification` field. `source_type`/`verification_status` are derived from it (N-03 partly done). "Mark verified now" sets `last_verified_at` and `next_check_due` = +90 days. **No `field_provenance` view, no admission-cycle editing, no fee editing** |
| `/ops/notices` | `admission_notices` with `review='pending'`; Approve / Reject | Extraction shows as raw JSON. **Approve only flips `review`: no `admission_cycles` row is created**, so an approved notice publishes nothing |
| `/ops/seats` | Unconfirmed `seat_status`; Confirm sets `confirmed_at`; Reject **deletes** the row | See `openseat.md` |
| `/ops/claims` | Pending `school_claims`; Approve sets `claim='claimed'` and adds a `school_members` admin; Reject | Evidence shows as raw JSON. Correctly leaves verification untouched (N-05) |
| `/ops/corrections` | Open `correction_requests` from `/portal/edit-request`; Resolve | Resolve only closes the request. The edit must be retyped in the record editor |
| `/ops/posts` | `school_posts` review (news/PR) | — |
| `/ops/localities` | Schools with `locality_id IS NULL`; assign | — |
| `/ops/orders` | Manual-provider orders awaiting payment; Mark paid | Concierge board belongs to `concierge.md` |
| `/ops/staff` | Lists `profiles.role IN (ops, admin)`; admin-only role changes (`requireAdmin()`) | One staff tier; no desk roles; no MFA (`docs/spec/access-control.md`) |
| `/ops/audit` | Latest 100 `audit_log` rows, filter by table | Audit triggers exist on `schools`, `admission_cycles`, `fee_items`, `seat_status`, `school_claims`, `applications`, `featured_placements`, `profiles`, `school_members`, `school_posts`, `school_teacher_affiliations`, `messages` |

**Not built:** `/ops/calls`, `/ops/moderation`, `/ops/inbox` (WhatsApp), public "Report an
update" intake (anon INSERT on `update_reports` was revoked by
`20260925093232_revoke_excess_grants.sql`, to be verified in `schema_migrations`; public reports
go through the `submit_update_report` api function in `admissions-tracker.md` §4, not yet built), the
observations tab, the coverage dashboard, and fee-report intake (`fee_reports` is not in
`src/lib/db/types.ts`). Server actions in `notices`, `seats`, `claims` and `corrections`
ignore Supabase errors.

**WhatsApp inbox (K5, P0 in Product Spec):** not built and currently blocked. The WhatsApp
provider is still an open decision (D-095), and no inbound-message table exists. It cannot ship
for the 15 Oct tracker launch unless Prav picks a provider this week.

## 3. Requirements

### 3.1 Queues (ops)

1. **P0 — Tasks are created by the system, not by hand.** Each producer below inserts one
   `ops_tasks` row (`kind`, `school_id`, `ref_table`, `ref_id`, `priority`, `due_at` = now + SLA)
   in the same server action or DB function as its source row:

   | Event | `kind` |
   |---|---|
   | new `admission_notices` (crawler, portal, change monitor) | `verify_notice` |
   | new `update_reports` | `verify_update` |
   | new `schools` row from ingestion, or AI research lead (D-028) | `verify_record` |
   | new `school_claims` | `claim_review` |
   | new `correction_requests` | `correction_request` |
   | new unconfirmed `seat_status` | `seat_update` |
   | call queue selection | `call_school` |

   A partial unique index on `(kind, ref_table, ref_id) WHERE status IN ('open','in_progress')`
   prevents duplicate tasks. Closing a queue item closes its task and writes `outcome`.
2. **P0 — Notices: source next to fields.** `/ops/notices/[id]` is a two-pane layout: a source
   preview on the left (the notice URL, or the stored PDF from `storage_path`, via a signed URL)
   and editable extracted fields per class on the right (status, opens, closes, results, form
   mode and URL, registration fee, `dob_from`/`dob_to`, documents). The actions are
   **Approve & publish**, **Edit & publish** and **Reject** (with reason).
   - Approve upserts `admission_cycles` on (school, `academic_year`, `class_code`), sets
     `verification='ops_verified'`, `source_type='official'` if the notice is on the school's own
     domain (otherwise `school_reported`), `verification_status='verified'`, and
     `verified_by`/`verified_at`/`last_checked_at`.
   - It also writes one `field_provenance` row per field with `evidence_url` = the notice URL.
   - Extraction confidence under 0.7 shows a "Check every field" banner.
   - Nothing publishes without the click (N-14, D-025).
3. **P0 — Updates queue.** `update_reports` (from the public Report an update, D-066) shows the
   report, the current published value and the attachment (staff-only signed URL).
   Actions: *Apply* (opens the record editor pre-filled), *Needs call* (creates `call_school`),
   *Reject*. "Request an update" counts are not tasks. They raise priority in the call queue
   (req. 9).
4. **P0 — New records.** `verify_record` tasks open the record editor with the source record
   (`source_records.payload`) beside it. The editor offers Publish, Hide (`status='hidden'`) and
   Merge (entity resolution stays manual; the D-030 match order is shown as hints).
5. **P1 — Claims (K6).** Render evidence by method (D-060): email domain vs the school website
   domain, board-record contact match, letterhead image plus callback outcome.
   - Approve requires the method's check to be ticked.
   - Claim approval never changes fact verification (N-05; already correct in
     `src/app/ops/claims/actions.ts`).
   - Claim v2 (magic links, domain OTP) lands 1 Nov (D-085). Until then this queue serves the
     existing flow.
6. **P0 — Corrections become apply-in-place.** Each request shows a field-level diff with
   *Apply* (writes the field, provenance `school_portal`, audit) or *Reject* (with a note to the
   school). Current-session dates/status/form link, contacts, hours and "about" from a verified
   admin skip this queue: they publish immediately and create an audit task due in 24 h (D-084).
   Earlier deadlines, cancellations, and name/board/affiliation/fee changes stay here.
7. **P1 — Moderation `/ops/moderation` (tabs).**
   - **Fee reports (D-013).** Open evidence (staff-only) → redaction tool (draw boxes over child
     name, roll/admission no., parent name and phone; save a redacted copy) → check the amounts
     against the evidence → Accept / Reject / Needs info.
     - Flags: outlier (> 1.5× IQR), Haryana Form VI ceiling (internal only, D-013), and "same
       fingerprint as N reports".
     - Schools cannot delete reports, only dispute them. Disputes land in this tab (D-062).
     - Originals are deleted 30 days after acceptance.
   - **School edits** needing review (req. 6).
   - **School fee responses and disputes.**
   - **News/PR posts** (existing `/ops/posts`, moved in as a tab).
8. **P0 — Empty states.** Every queue says "Nothing pending" with a link back to `/ops`
   (existing `EmptyState`). A queue whose producer isn't live yet says so ("Fee reports open
   1 Nov") instead of showing 0.

### 3.2 Call queue `/ops/calls` (P0, D-065, D-014)

9. **Queue order** (highest first):
   1. cycles `open`/`closing_soon` with `closes_on` ≤ today + 7 and `next_check_on` ≤ today;
   2. pilot-set schools (Jaipur top 150, Gurugram top 100, D-007) with no current-session cycle;
   3. any `next_check_on` ≤ today;
   4. highest request-update count;
   5. Tier A before B before C.
10. **Call screen.**
    - A header with click-to-call phones (`tel:`), last outcome and known cycles.
    - **Outcome:** reached / no answer / call back at … / wrong number / refused / not admitting
      this year.
    - **Per-class capture** with bulk-apply to a class range: status, opens, closes,
      test/interaction, results, form mode and link, form fee, age window, documents, seats.
    - **Evidence:** "asked school to WhatsApp the notice" (y/n).
    - **Claim invite:** contact name and role (internal only) and a "Send claim link" button.
      Every reached call ends with a claim invite (D-065).
11. **Save.**
    - Upsert `admission_cycles` (`source_type='schooloye_verified'`,
      `verification_status='verified'`, `last_checked_at=now()`).
    - Write `field_provenance` with `source_id=2` (`ops_call`).
    - Insert `sales_activities` (kind `call`).
    - Close the `call_school` task.
    - A random 10% of saves create a second-review task.
12. **`next_check_on` rules** (computed server-side in IST on save):
    - open and closing within 7 days → today + 3;
    - open → the day after `closes_on`;
    - upcoming → `opens_on` − 2;
    - not announced → today + 14 (today + 7 in Nov–Jan);
    - closed → `results_on` + 1.

    Unreachable outcomes set today + 1 (no answer) or the stated call-back time.
13. **Throughput view.** Calls done today per caller and the remaining due count. The planning
    figure is 25–40 calls per caller per day. Season staffing is still open (D-095).

### 3.3 School record editor (P0, K2)

14. **Split verification into two inputs.** Replace the legacy `verification` select with
    `source_type` and `verification_status` inputs. "Unknown" is a real state (N-03). The legacy
    column stays written for old readers until it is retired (a destructive step, D-073).
15. **Observations tab (read-only P0, actions P1).**
    - Lists every `field_provenance` row per field with source, `evidence_url`, `verified_by` and
      dates. Conflicting values are highlighted.
    - P1 actions: accept, reject, supersede.
    - A conflict sets `verification_status='conflicting'` and adds a `data_quality_flags` row.
      The page keeps the higher-precedence value with "Re-checking" (D-026).
16. **Admissions tab.** Cycles per session and class with the same capture form as calls (req. 10).
17. **History.** `audit_log` rows for this school with a before/after diff.
18. **Stale fact list.** The editor lists this school's facts past their D-087 limit:
    - admissions open/closing: 3 days;
    - upcoming / not announced: 14 days;
    - fees: per session or 180 days;
    - contacts: 90 days;
    - identity: 365 days.

### 3.4 Coverage dashboard (`/ops` home, P0 counts, P1 charts)

19. Per city (Jaipur now, Gurugram from 1 Nov, D-080):
    - schools by tier and `status`;
    - % of the pilot set with a verified current-session cycle (L3, D-090);
    - count toward the `SITE_INDEXABLE` flip at ≥ 50 Jaipur L3 schools (D-094);
    - % with published fees; % claimed;
    - median fact age per family;
    - each queue's size and oldest item age against its SLA (red text only for breach, always
      with a label, D-050).

### 3.5 WhatsApp shared inbox `/ops/inbox` (K5)

20. **P0 in the Product Spec, blocked on D-095.** Once a provider is chosen:
    - inbound webhook → `whatsapp_messages` (additive DDL, data session per D-091), linked to a
      school when the number matches `schools.phone` or a `school_members` profile phone, and to
      a parent profile otherwise;
    - the inbox shows threads, assignee and status (open / waiting / done) and replies inside the
      24-hour session window (templates outside it);
    - "Make task" converts a message into `verify_update`/`seat_update` with the message as
      evidence;
    - media is staff-only, and bodies with child personal data are never copied into tasks.

    **Interim until then:** support runs from the WhatsApp Business app on a shared device;
    school messages with notices or seat news are forwarded into `update_reports` by staff.

### 3.6 Staff, roles, audit

21. **P1 — Desk roles.** `profiles.role` stays `ops`/`admin` (D-061). Add a staff desk tag
    (`data`, `admissions`, `support`, `success`) for queue defaults and assignment only, not for
    RLS. Only `admin` changes roles (built).
22. **P1 — MFA** (TOTP) required for `ops`/`admin` before any staff account beyond the founder.
23. **P0 — Audit.** Every ops write goes to `audit_log` through triggers (N-06). Add triggers
    for `update_reports`, `correction_requests`, `admission_notices` and `ops_tasks`. `/ops/audit`
    gets actor, entity and date filters and a link to the record.

### 3.7 SLAs

| Queue | SLA (P0 target) |
|---|---|
| In-season admission notices (`verify_notice`) | 12 h |
| School edits needing review / D-084 audit | 24 h |
| Parent/school update reports | 24 h (48 h off-season) |
| Seat updates | 24 h |
| Fee reports | 48 h |
| Claims | Fast-track (domain / registry OTP): confirm within 1 business day; letterhead: 2 working days |
| Call re-checks | by `next_check_on` |
| WhatsApp inbox first reply | 2 h, 9:00–19:00 IST (after K5 ships) |

`due_at` = creation time + SLA. A breach shows on the dashboard and on the task row.

## 4. Data

**Reads and writes** (raw tables under staff RLS): `ops_tasks`, `schools`, `admission_cycles`,
`admission_notices`, `field_provenance`, `source_records`, `sources`, `data_quality_flags`,
`school_claims`, `school_members`, `correction_requests`, `update_reports`, `seat_status`,
`school_posts`, `localities`, `audit_log`, `profiles`, `sales_activities`, `fee_items`.

**Additive DDL** (request to the data session, D-091, D-111; collected in `docs/spec/data-requests.md` (R-03, R-05, R-07)):

```sql
alter table admission_cycles add column next_check_on date;           -- D-065 (schools.next_check_due stays for record-level checks)
create index on admission_cycles (next_check_on) where next_check_on is not null;
create unique index ops_tasks_open_ref on ops_tasks (kind, ref_table, ref_id)
  where status in ('open','in_progress');
-- update_reports.kind/field: see data-requests.md R-05 (values wrong_fact | new_info | closed_or_moved | other | request_update)
-- fee_reports, field_families, source_precedence, observed_at/scope_key/review_state on field_provenance: per entity spec §6.1
-- whatsapp_messages: only after D-095 provider decision
```

`update_reports.status` already uses `review_status` (`pending`/`approved`/`edited`/`rejected`/`needs_triage`).
Keep `correction_requests` until the merge into `update_reports` is approved. Dropping it is
destructive (D-073).

**This repo:** audit triggers and staff RLS policies on the new tables (a migration via
`pnpm db:migrate`). Views are unchanged except for the new `api.public_school_updates` owned by
the school-page spec.

## 5. Rules

- **Publishing.** Nothing extracted, crawled or AI-researched is published without a staff
  click (N-14, D-025, D-028); the one exception is the D-084 fast path. Competitor aggregators
  may be opened as leads but never saved as a `source_id` (D-027).
- **Provenance.** Every publish writes `field_provenance`. Source names never go into values
  (N-12).
- **Privacy.**
  - Fee-report originals, claim letterheads and WhatsApp media are staff-only, served by signed
    URLs, and never linked from public pages.
  - Fee reports hold no child data (D-067).
  - Redaction happens before any non-ops view.
  - Ops never asks for or stores parent portal passwords (D-010).
  - Personal data in `audit_log.before/after` follows the retention in `docs/ops/data-retention.md`.
- **Credentials.** No service-role key (N-11). Everything goes through RLS `is_staff()`.
- **Red.** Margin red is not used for SLA breaches. Use bold text and a label (D-050).

## 6. Acceptance criteria

- [ ] Creating a notice, update report, claim, correction or seat report produces exactly one
      open `ops_tasks` row; a second identical event does not.
- [ ] Approving a notice creates or updates the matching `admission_cycles` row and
      `field_provenance` rows, and the school page shows it within 60 s via `/api/revalidate`.
- [ ] Rejecting a notice publishes nothing.
- [ ] `/ops/calls` orders schools by req. 9. Saving a call sets `next_check_on` per every
      branch of req. 12 (unit-tested in IST).
- [ ] The record editor shows `field_provenance` per field and writes `source_type` +
      `verification_status` directly.
- [ ] A D-084 fast-path edit is live immediately and appears as a 24 h audit task.
- [ ] A fee report goes submitted → redacted → accepted, and the unredacted original is
      unreachable for non-staff (RLS test).
- [ ] Dashboard counts match hand counts for Jaipur.
- [ ] Every ops server action surfaces DB errors instead of redirecting silently.
- [ ] `pnpm verify:views` passes; no `/ops` route is indexable.

## 7. Deferred and open

- **Deferred:** sales CRM UI (K7, P1); data-quality console (trigger in decisions.md);
  reviews moderation (P2); automated entity resolution (> 2 sources per city or > 2% duplicates).
- **Settled since 27 Sep:** whether seat updates from a verified school admin join the D-084 fast
  path — settled by D-100. They do: immediate publish, labelled "Reported by school · date", with
  a 24 h ops audit (see `openseat.md`).
- **Open (Prav):**
  - WhatsApp provider and season staffing (D-095). These gate §3.5 and the throughput plan.
