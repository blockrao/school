# OpenSeat (Seat Availability) — Developer Spec

**Status:** draft (partly built: portal report + ops confirm; not public) · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** N-06, N-09, N-13, N-14, D-004, D-024, D-026, D-050, D-061, D-067, D-069, D-084, D-087, D-091, D-095, D-100, D-107 (see `docs/decisions.md`) · **Guidelines:** `docs/guidelines/seo-geo.md`

## 1. Purpose and scope

OpenSeat tells a parent whether a school has a seat in a class **now**. That covers the
admission season and mid-session after a transfer. Seat status is one of the four things
SchoolOye keeps (D-004). Every seat fact is shown with who said it and when, and no seat fact is
ever published without a person confirming it (N-14).

**In scope:** `seat_status` per school × session × class (P1); parent labels and confidence
(P1); school updates from the portal and from WhatsApp, confirmed by ops (P1); "I need a seat"
requests (P2); anonymous demand summaries for schools (P2); seeding from official vacancy lists
such as KVS (P2).

**Out of scope:** the relocation package (F8, P2, concierge spec); any "guaranteed seat" wording
(SchoolOye does not sell admissions, N-13); paid seat placement (D-089 keeps sponsored cards off
the facts).

## 2. Current state (verified against the repo on 27 Sep 2026)

**Table `seat_status`** (baseline migration):
- Columns: `id`, `school_id`, `academic_year`, `class_code`, `public_status`
  (`open|limited|waitlist|closed`), `range_label`, `exact_count`, `confidence`
  (`confirmed|reported|application_possible`), `mid_session_accepted`, `reported_via`,
  `reported_at`, `confirmed_at`.
- **UNIQUE (`school_id`, `academic_year`, `class_code`).**
- Audit trigger `seat_status_audit` (N-06).

**RLS** (`supabase/migrations/20260925111432_schools_flow_policies.sql`): a school member may
insert and update only rows with `confirmed_at IS NULL`. Staff have full access.

**View** `db/views/030_public_seat_status.sql` → `api.public_seat_status` (rows with
`confirmed_at IS NOT NULL`). Zod contract: `src/contracts/public-seat-status.ts`.

**Portal** (`src/app/portal/page.tsx`, `updateSeatStatus` in `src/app/portal/actions.ts`): a
per-class radio (open/limited/waitlist/closed) plus a free-text "Seats" box. It inserts with
`confidence='reported'`, `reported_via='school_portal'`.

**Ops** (`src/app/ops/seats/*`): Confirm sets `confirmed_at`. Reject **deletes** the row.

**UI primitive:** `SeatPill` (`src/components/ui/badges.tsx`, statuses available/few/waitlist/full).

**Defects in what is built:**
1. **Second save fails silently.** The portal inserts a new row per class on every save. The
   unique key rejects the second save for any class, and the action ignores the error.
2. **Confirmed rows are frozen.** Once ops confirms a row, the school can't update it, because
   the RLS update needs `confirmed_at IS NULL`. The school's own seat status is frozen after the
   first confirmation.
3. **Accidental "closed" reports.** Every class radio defaults to `closed`, so one save reports
   every class in `class_levels` as closed, including classes the school doesn't teach.
4. **Confidence never changes.** Confirm never changes `confidence`, sets no `confirmed_by`, and
   Reject destroys history.

**Not built:**
- No public page reads `api.public_seat_status`. OpenSeat is invisible to parents. Screen-map
  row 8 (`/[locale]/[city]/seats-available` plus the school-page block) is **pending**.
- No WhatsApp parsing (the provider is still open, D-095).
- No seat requests, no demand summaries, no KVS source.

## 3. Requirements

### School (portal)

1. **P1 — Upsert, one row per class.** Saving upserts per class.
   - A changed report on a confirmed row does not overwrite it. It is written as a pending
     report (see §4), and the public value stays until ops confirms the new one.
   - Only classes between the school's `min_class` and `max_class` are shown.
   - The radio has no default: an untouched class is not reported.
2. **P1 — Fields per class:** status; optional seats as a range (`1–5`, `6–10`, `10+`) or an
   exact count (internal only); session (current or next); "accepting mid-session admissions"
   (y/n).
3. **P1 — Publish path (D-100, extends D-084).** A verified admin's seat update publishes
   immediately, labelled "Reported by school · {date}" (D-107), with an ops audit due within 24 h.
   Confirmation copy for an admin: "Live now. Parents see this immediately." A staff (non-admin)
   member's update still goes through review: "Sent for review. Parents see this once SchoolOye
   confirms it, usually within a day." Class range and facilities changes stay in review
   regardless of role (D-100).

### Ops

4. **P1 — Review queue.** `/ops/seats` shows old value → new value per class, reporter, channel
   and age. A new report creates a `seat_update` task with a 24 h SLA (`ops-console.md`).
   - **Confirm** sets `confirmed_at` and `confirmed_by`, and sets `confidence`:
     - `confirmed` when ops spoke to the school (call or verified-admin portal) today;
     - `reported` when it came by message without a callback;
     - `application_possible` when the school says forms are accepted but gives no seat
       position.
   - **Reject** keeps the row with `review='rejected'` and a reason. No delete.
5. **P1 — WhatsApp updates (G3).** Blocked on D-095.
   - When the provider is chosen, an inbound school message ("2 seats in class 4, no seats in
     nursery") is parsed by AI into a proposed per-class diff and attached to a `seat_update`
     task.
   - It is never auto-published. Ops confirms or edits.
   - A message from a number that is not verified for that school requires a callback before
     `confirmed`.
   - Until then, staff type WhatsApp-reported seats into the same form.
6. **P1 — Calls.** The call capture form (`ops-console.md` req. 10) includes seats. A call save
   writes `confidence='confirmed'`.

### Parent

7. **P1 — School page block "Seats" under Admissions.** Rendered when a confirmed row exists for
   the current or next session, or when a verified admin's row is published immediately under
   D-100 (see req. 3). Otherwise nothing is shown: no "Not yet published" placeholder for seats.
   Absence isn't a fact. The labels (text always shown; colour follows the `SeatPill` tokens;
   never margin red, D-050):

   | `public_status` | Parent label |
   |---|---|
   | open | Seats available |
   | limited | Few seats |
   | waitlist | Waitlist |
   | closed | Full |

   A range, if present, is appended: "Seats available · 1–5". `exact_count` is never shown.
8. **P1 — Confidence and freshness line** under each row, using D-024 wording:
   - `confirmed` via call → "Confirmed with school by phone · 2 Oct".
   - `confirmed` via verified portal → "Verified by school · 2 Oct".
   - verified admin, published immediately (D-100) → "Reported by school · 2 Oct" (D-107; ops audit
     pending; not yet "Verified by school" until ops confirms it).
   - `reported` (staff/non-admin, still in review) → "Reported by the school · 2 Oct · not yet
     confirmed by phone".
   - `application_possible` → "Application possible — call the school to check".
   - Stale rule (D-087 admissions family; the entity spec §3.3 puts seats there): stale after
     3 days while the class's current cycle is open or closing, otherwise 14 days. A stale row
     shows the pencil-yellow "Re-checking" marker and bold text and stays visible (D-026).
9. **P1 — Mid-session.** Rows with `mid_session_accepted = true` for the current session show
   "Taking mid-session admissions".
10. **P1 — City page `/[locale]/[city]/seats-available`** (screen-map row 8).
    - Lists schools with confirmed open/limited/waitlist rows, grouped by class, with a class
      filter.
    - Filter URLs are `noindex` (N-08). The unfiltered page is not one of the D-053 named
      landing pages, so it is **`noindex, follow`** unless D-053 is extended.
    - Short revalidate (15 min) plus `cacheTag('city:<slug>')`.
    - Empty state: "No schools have confirmed open seats in Jaipur right now. Get an alert when
      one does." The alert CTA is the existing `/alerts`.
11. **P2 — "I need a seat" (G4).**
    - Signed-in parent (phone OTP); consent purpose `seat_request` (a new purpose, D-069).
    - Fields: city, locality or area, class, board (optional), fee band (optional), urgency
      (this month / this term / next session), note.
    - **No child name or DOB** (D-067).
    - Stored in `seat_requests`. The parent sees and withdraws requests in `/my`.
    - When a matching confirmed seat appears, send a WhatsApp alert through the existing alerts
      pipeline, once per match.
    - Copy: "We'll tell you if a school reports a seat. We can't reserve seats."
12. **P2 — Demand summary for schools (G5).**
    - Portal card: "Parents looking for Class 4 near Malviya Nagar in the last 30 days: 12".
    - Only shown when the count is ≥ 5 (k-anonymity). Counts only; no parent identity, no notes.
    - Not built before real requests exist. No placeholder numbers (the Insights precedent in
      `docs/page-enrichment-backlog.md`).
13. **P2 — Official seeding (G6).**
    - Import published vacancy lists (e.g. KVS class-wise vacancies) as `source_records` in the
      data repo, then ops confirms them as `seat_status` with `reported_via='official'`.
    - Parent label: "Official record · KVS vacancy list · {date}".

## 4. Data

**Read by the UI:** `api.public_seat_status`. Extend its contract with `confirmed_by_channel`
(derived) and hide `exact_count` (already excluded).

**Additive DDL** (data session, D-091):

```sql
alter table seat_status add column review review_status not null default 'pending';
update seat_status set review = 'approved' where confirmed_at is not null;   -- backfill: existing confirmed rows stay public
alter table seat_status add column confirmed_by uuid references profiles(user_id);
alter table seat_status add column pending_status seat_public_status;   -- school's proposed change on a confirmed row
alter table seat_status add column pending_range_label text;
alter table seat_status add column pending_reported_at timestamptz;
alter table seat_status add column published_by_admin_at timestamptz;   -- D-100 immediate publish
-- P2
create table seat_requests (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(user_id),
  city_id int not null, locality_id int, class_code text not null, board_id int, fee_band text,
  urgency text not null, note text, consent_id bigint references consents(id), status text not null default 'open',
  created_at timestamptz not null default now());
-- 'seat_request' added to consent_purpose enum
```

**This repo:**
- Replace the member update policy so members may set `pending_*` on confirmed rows but never
  `public_status`, `confirmed_at` or `confidence`.
  - This is an RLS change on a non-personal table. It is non-destructive in effect but still
    edits a policy, so show the SQL to Prav first.
- View update so `api.public_seat_status` shows rows with `review='approved'` and
  `confirmed_at IS NOT NULL`, plus D-100 admin-published rows (below), and nothing else.
- D-100 immediate publish for a verified admin: a `SECURITY DEFINER` function analogous to
  `portal_publish_edit` (`school-portal.md` §4) — checks `is_school_admin`, writes
  `public_status`/`range_label` directly with `confidence='reported'` and no `confirmed_at`, and
  enqueues the 24 h ops audit item. `api.public_seat_status` also shows rows with
  `confidence='reported' AND published_by_admin_at IS NOT NULL` (whatever their `review`),
  alongside the approved confirmed rows.
- The aggregate for demand summaries is a view with `HAVING count(*) >= 5`, granted only to
  school members through a scoped function.

## 5. Rules

- Never imply a seat is held or guaranteed. No "Book seat" button; the CTA is "Call school" or
  "Get help applying" (N-13, D-010).
- Seats are not ranked or sponsored. A sponsored card never sits inside the seats list (D-089).
- Seat requests are personal data. They are covered by the parent's data export and deletion
  (E6) and are never joined into public views (N-09).
- SEO: see `docs/guidelines/seo-geo.md`. There is no `Offer`/`Event` JSON-LD for seats.

## 6. Acceptance criteria

- [ ] A school can save seat status twice and change a confirmed class. The second change shows
      as pending in `/ops/seats` and does not alter the public value until confirmed.
- [ ] Untouched classes and classes outside the school's range are not reported.
- [ ] Ops Reject keeps the row. Confirm sets `confirmed_by` and the chosen `confidence`.
- [ ] The school page shows the Seats block only with a confirmed row, with a text label and a
      D-024 source line; a stale row shows "Re-checking".
- [ ] `/[locale]/jaipur/seats-available` renders a real empty state and is `noindex`.
- [ ] `exact_count` never appears in any `api.*` view or HTML.
- [ ] (P2) Seat requests store no child fields. A demand card with fewer than 5 requests
      renders nothing.

## 7. Deferred and open

- **Deferred:** WhatsApp parsing until the D-095 provider decision; `seat_requests`, demand
  summaries and KVS seeding to P2 (Apr–Jun 2027); relocation package (F8).
- **Settled since 27 Sep:** whether a verified admin's seat edit should publish immediately —
  settled by D-100 (extends D-084). It publishes immediately, labelled "Reported by school ·
  date" (D-107), with a 24 h ops audit; see reqs. 3, 7, 8 and §4.
- **Open (Prav):**
  - Should `/[city]/seats-available` be added to the D-053 indexable landing pages?
