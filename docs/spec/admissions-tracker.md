# Admissions tracker + alerts — Developer Spec

**Status:** draft (all sections) · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** N-02, N-03, N-08, N-09, N-10, N-11, N-13, D-006, D-007, D-008, D-009, D-012, D-014, D-022, D-024, D-025, D-026, D-045, D-047, D-049, D-050, D-053, D-064, D-065, D-066, D-067, D-069, D-080, D-084, D-086, D-087, D-089, D-090, D-091, D-094, D-095, D-096, D-098, D-099, D-108, D-110 (see `docs/decisions.md`) · **Guidelines:** `docs/guidelines/seo-geo.md`, `docs/guidelines/content-and-trust.md`
**Related spec:** the per-school admissions section, `/admissions` sub-route, snapshot sentence and Event JSON-LD live in `school-entity-page.md`. This file does not restate them.

## 1. Purpose and scope

The tracker turns approved `admission_cycles` rows (one per school × session × class, N-02) into the parent's answer to "what do I need to do this week, and for which schools?" It is the season's core product and feeds the north-star metric, WhatsApp alert subscribers per city (D-008). The tracker goes live **15 Oct 2026** for Jaipur, with Gurugram following by 1 Nov (D-006, D-080). The wedge is freshness: every row shows when it was checked and by what source.

**In scope**
- City admissions page: closing soon, opened this week, opening soon, open with no last date.
- Status model and how it is shown (stored vs derived states).
- Age-eligibility checker at `/[locale]/tools/age-eligibility`.
- Documents checklist, per school and combined for a shortlist.
- RTE/EWS information pages: Rajasthan (PSP portal) and Haryana (UJJWAL portal).
- Calendar export (.ics and Google Calendar link), P1.
- Alerts: sign-up, triggers, weekly digest, unsubscribe. WhatsApp first, email P2.
- "Report an update" (public) and "Request an update" (counted demand).

**Out of scope**
- Per-school admissions card and `/admissions` page: `school-entity-page.md`.
- Exam hubs (`/[locale]/exams/{slug}`, D-012) and exam alerts (`alert_subscriptions.exam_ids`): exam spec.
- Delhi nursery hub: content before the DoE notification (D-080), in its own spec.
- Concierge/application help: D-010 and its own spec.
- Two-way WhatsApp bot (Product Spec D5): P1, blocked on the provider decision (D-095).
- Common application form, reviews, fee comparison, rankings (D-009).
- Sponsored cards: not before 1 Dec (D-089).

## 2. Current state (verified against the repo on 27 Sep 2026)

| Area | What exists | Gap |
|---|---|---|
| City page | `src/app/[locale]/[city]/page.tsx`. Its `?admissions=open` filter is noindex (N-08) and uses `listPublicSchools…({admissionsOpen})` in `src/lib/db/public-adapter.ts:363`, which filters on **stored** `status in (open, closing_soon)`. | There is no dedicated admissions page. `/[locale]/[city]/admissions` is **pending** (`docs/screen-map.md` row 4; design `design/City List.dc.html`). |
| Card deadline margin | `getAdmissionDeadlinesBySchoolId` (`public-adapter.ts:500`) takes the earliest `closes_on` across **all** of a school's cycles. | It ignores status and session, so an old closed cycle can hide an open one. |
| Status/deadline logic | `src/lib/deadline.ts`: pure, IST calendar days, covers closing-soon, deadline-day, open, open-no-deadline, upcoming, not-announced, closed, seats-now. `deadlineToPill` maps these to `StatusPill`. | No `results_out`, `postponed` or `cancelled`. It derives from dates only and ignores the stored status. |
| Admissions view | `db/views/020_public_school_admissions.sql` exposes year, class, status, form_mode, opens/closes, fee, form_url, last_checked_at, verification, days_to_close. It is gated on legacy `verification in ('ops_verified','school_verified')`. | It does not expose `dob_from/dob_to`, `results_on`, `documents_required`, `notice_url`, `seats_total`, `source_type`, `verification_status`, cycle id or `school_code`. `days_to_close` uses `current_date`, which is the DB's UTC date, not IST. `closing_soon` is stored, not derived. The contract is `src/contracts/public-school-admissions.ts`. |
| Exam cycles | `api.public_exam_admissions` exists (contract `src/contracts/public-exam-admissions.ts`) and backs `/[locale]/exams/[slug]`. | Its SQL is **not** in `db/views/`, so the repo has drifted from the DB. |
| Age checker | `src/app/[locale]/tools/age-eligibility/page.tsx` (designed+built) shows age on 31 Mar, 30 Jun and 30 Sep of the next academic year (`src/lib/age.ts`) plus general guidance, with no per-school verdict. `src/lib/eligibility.ts` + `src/components/admissions/eligibility-checker.tsx` hold the generic dob-window verdict logic, currently used on exam pages only. | The DOB is submitted as a **GET query param** (`?dob=`) to a Server Component, which conflicts with D-067. |
| Alerts sign-up | `src/app/[locale]/alerts/page.tsx` + `actions.ts` sit behind the OTP `/sign-in` gate. The form is a class grid (c1–c12 only), an optional `school_id` and a consent checkbox. It writes `consents` (purpose `whatsapp_alerts`, `ALERTS_NOTICE_VERSION` in `src/lib/consent.ts`) and upserts one `alert_subscriptions` row per user+city. Grants: `20260925093233_narrow_alerts_grants.sql`. | Following a second school **replaces** `school_ids` instead of merging. There are no pre-primary classes, no area and no `utm` capture. |
| Unsubscribe | `unsubscribeAlert` in `src/app/[locale]/my/actions.ts`: signed-in only. It sets `active=false` and withdraws **all** `whatsapp_alerts` consents. | There is no one-tap (no-login) unsubscribe. |
| Sending | Nothing is built: no sender, no templates, no digest, and nothing in `src/` writes `alert_deliveries`. The WhatsApp provider is still open (D-095). | Everything. |
| Report/Request update | `update_reports` table exists. Anon **and** authenticated privileges were revoked in `20260925093232_revoke_excess_grants.sql` and never re-granted. `site-footer.tsx` notes there is no screen. | Not built (`screen-map.md` row 1). |
| Calendar, documents checklist, RTE pages | `document-checklist-item.tsx` exists (used in concierge). `/[locale]/guides` has one guide. | Not built. |
| Freshness | `src/lib/freshness.ts`: `STALE_AFTER_DAYS = 7` for every fact. | Should follow the per-type limits in D-087. |

Types: `src/lib/db/types.ts` lists `admission_status` without `postponed`/`cancelled`, but the live enum has them. Run `pnpm db:types` before building.

## 3. Requirements

### 3.1 Status model (P0)

Stored values (the live enum) record only what the school or authority announced. `closing_soon` is **derived**, never stored (this matches school-entity-page §5.1). One pure function, `admissionDisplayState(cycle, nowIST)` in `src/lib/deadline.ts`, is the only source of margin colour.

| Stored status | Dates | Parent label (EN) | Margin |
|---|---|---|---|
| `not_announced` | — | "Dates not announced" (+ "Last year: forms opened {date}" once `previous_cycle_id` exists, P1) | slate "—" |
| `upcoming` | opens_on > today | "Opens {d MMM}" | dashed ink |
| `open` | closes_on > today+7 | "Open · last date {d MMM}" | ink |
| `open` | closes_on null | "Open · no last date announced" (rolling) | ink |
| `open`/`closing_soon` | 0 ≤ closes_on − today ≤ 7 | "Closes in N days" / "Last date today" | **margin red** (D-050) |
| `open`/`closing_soon` | closes_on < today | "Closed {d MMM}" (derived) | slate |
| `closed` | — | "Closed" | slate |
| `results_out` | — | "Results out" + link | slate |
| `postponed` | new dates if known | "Postponed" + new date, or "new date not announced" | ink (red only if a new closes_on ≤7 days) |
| `cancelled` | — | "No admissions this session" | slate |

Precedence rules:
- `not_announced`, `postponed`, `cancelled` and `results_out` win over dates.
- For `upcoming`, `open` and `closed`, the dates win.
- Waitlist is **not** an admission status. It comes from `seat_status.public_status = 'waitlist'` (OpenSeat) and is shown as a separate seat line.
- Every label has text next to its colour.
- Every row carries `FreshnessLine` with the D-024 label and "Checked N days ago". It is stale after 3 days for open or closing cycles and 14 days for upcoming or not-announced cycles (D-087). Stale rows are shown with "re-checking", never hidden (D-026).

### 3.2 Parent: city admissions page

- **T-1 (P0)** `/[locale]/[city]/admissions` (this route is settled, D-096) renders the current session's approved cycles for the city, grouped in this order:
  1. **Closing soon**: derived, ≤7 days, soonest first.
  2. **Opened this week**: `opens_on` in the last 7 IST days.
  3. **Opening in the next 14 days**.
  4. **Open, no last date**.
  5. **All other open**.

  Each row shows the school name (linking to its canonical URL, D-040), class label, board and locality, form mode, form fee (or "Not yet published", D-049), official form link and freshness line. The heading shows counts ("12 closing soon").
- **T-2 (P0)** Filters for class, board, locality and form mode use query params. Filtered URLs are `noindex, follow` (N-08). The unfiltered page is a named landing page and indexable (D-053) once `SITE_INDEXABLE` flips (D-094). The home page and city page link to it ("See all admissions open in Jaipur").
- **T-3 (P0)** Empty state: "No forms are open for {class} in {city} right now. Get a WhatsApp message the day one opens." plus the [Get alerts] button. The page never shows filler schools.
- **T-4 (P0)** A row can list several classes for one school. It collapses to one school row with per-class chips, and the red margin follows the soonest ≤7-day class.
- **T-5 (P1)** "Recently closed" section (closed in the last 14 days) with "Results expected {date}" where known.
- **T-6 (P1, from 1 Dec)** Sponsored cards carry a border and a "Sponsored" label, never inside or above the Closing-soon group (D-089, N-13).
- **T-7 (P0)** Hindi (`/hi/[city]/admissions`) by 15 Nov (D-086). Until then there is no hreflang to `/hi`.

### 3.3 Parent: age-eligibility checker (`/[locale]/tools/age-eligibility`)

- **T-10 (P0)** The DOB never leaves the browser (D-067). The page becomes a static shell plus a client island reusing `eligibility-checker.tsx`/`src/lib/eligibility.ts`. The form has no `action`. Remove the `?dob=` GET handling, and never log the DOB or include it in analytics (`age_check_done` records city and class only).
- **T-11 (P0)** Inputs: DOB (date picker), city (defaults from the city cookie), optional class. On submit, the island fetches a public, cached JSON of the city's current-session cycles `{school_code, name, class_code, dob_from, dob_to, display_state, form_url}` from a route handler at `/[locale]/[city]/admissions/eligibility.json`, which reads the `api` view only.
- **T-12 (P0)** Output is grouped as in the exam checker:
  - (a) **Eligible and open now**, with an apply link.
  - (b) **Eligible, not open yet**, with the reason.
  - (c) **Not eligible**, with how many months off.
  - (d) **School hasn't published an age rule**.

  A summary line reads "Eligible for Nursery 2027-28 at 34 schools with published cut-offs; 51 schools haven't published one."
- **T-13 (P0)** A state-rule fallback is used only where an official notification is recorded as a source (for example, Haryana Class 1 = 6+ from 2026-27, per school-entity-page §5.1). It is labelled "State rule, not confirmed by school". Rules live in `src/lib/age-rules.ts`, each with its source URL and date. With no sourced rule, the result is bucket (d), plus the existing "age on common cut-off dates" table.
- **T-14 (P0)** Plain-language copy (class 6–8 reading level): "who can apply", "last date to apply". Tap targets ≥44 px and text ≥14 px (D-050).

### 3.4 Parent: documents checklist

- **T-20 (P1)** Per school and class, render `documents_required` as a checklist with a copy/share (WhatsApp) button and the cycle's freshness line. The per-school block lives in the entity spec. This spec adds the **shortlist combined checklist** at `/my/shortlist/documents`: it dedupes items case- and whitespace-insensitively, shows which schools need each item, and flags items needed by only one school.
- **T-21 (P1)** A general "Documents commonly asked for" guide at `/[locale]/guides/admission-documents`, labelled general guidance and never presented as a school fact. It mentions masked Aadhaar only (D-068).

### 3.5 Parent: RTE/EWS pages

- **T-25 (P1)** `/[locale]/guides/rte-rajasthan` goes live in late Jan 2027, before the February window. It is Hindi-first (`/hi` published at the same time). Content:
  - who qualifies and the 25% seats;
  - the PSP portal link;
  - Jan Aadhaar requirement and the up-to-5-schools catchment choice;
  - the application and lottery dates for 2027-28;
  - a documents list.

  Every date cites the current official notification with a checked date. Before the notification: "2027-28 dates not announced · last year: 20 Feb–10 Mar, lottery 12 Mar" (source cited).
- **T-26 (P1)** `/[locale]/guides/rte-haryana` (UJJWAL portal) goes live in March 2027, with the same structure (D-006).
- **T-27 (P1)** RTE seat counts per school (`rte_seats`, school-entity-page §5.1) show on the school page, not here. These pages link to the city admissions page and to alerts ("Tell me when RTE forms open").

### 3.6 Parent: calendar (P1)

- **T-30** `/[locale]/[city]/admissions/calendar.ics?class=` (public, noindex) and `/[locale]/my/shortlist/calendar.ics` (auth).
  - Each file has all-day VEVENTs for `opens_on`, `closes_on` and `results_on`.
  - `UID = {cycle_id}-{kind}@schooloye.com`, and `SEQUENCE` increases with `updated_at` so date changes update subscribed calendars.
  - DESCRIPTION holds "Checked {date} · {source label}" and the school URL with UTM.
- **T-31** Each deadline row has an "Add to Google Calendar" link (template URL, no API).
- **T-32** A weekly city calendar image (`next/og`) for WhatsApp/Instagram. It shares its generator with the daily posts (Product Spec J2).

### 3.7 Parent: alerts

- **T-40 (P0) Sign-up.** Phone OTP (existing `/sign-in`), then:
  - city;
  - classes from `class_levels`, including pre-primary codes if present — not a hard-coded c1–c12;
  - optional area (locality);
  - optional schools;
  - an explicit WhatsApp opt-in checkbox (D-064, D-069).

  Entry points are: city admissions rows, school page ("Get alerts" pre-filled with school + class), age checker results, RTE pages and the home page.
- **T-41 (P0)** Following another school **merges** into `school_ids` (array union); it never replaces them. `utm` stores the first-touch `utm_*` params (Product Spec J5).
- **T-42 (P0 to store; sending starts once the provider is live, D-095) Triggers**, evaluated on approved values only (D-025):

| Event | Who gets it | Message (template, EN; HI per `language`) |
|---|---|---|
| Cycle becomes upcoming/open | followers of the school; city subscribers for that class, bundled | "{School}: {Class} 2027-28 forms open {date}. Last date {date}." |
| 3 days before and deadline-day morning (08:00 IST) before `closes_on` (D-098) | followers of the school | "Last date for {School} {Class} is {date}." |
| `opens_on`/`closes_on` changed | followers of the school | "{School} changed the last date to {date}." |
| Postponed / cancelled | followers of the school | "{School}: {Class} admissions postponed/cancelled." |
| Results published | followers of the school | "{School} {Class} results are out." + link |
| Approved notice published | followers of the school | notice title + link |

  Change events come from `audit_log` rows on `admission_cycles` (N-06), and reminders from the IST date. There is one delivery per (subscription, cycle, kind). Quiet hours are 21:00–08:00 IST (D-110): nothing is sent in that window, and the deadline-day reminder goes at 08:00 IST (D-098). At most 2 messages per subscriber per day (city bundles count as 1). Links carry `utm_source=whatsapp&utm_medium=alert&utm_campaign={kind}`.
- **T-43 (P0) Weekly digest.** Friday 18:00 IST per city, in the subscriber's language, filtered by class and area:
  - closing in the next 7 days;
  - opened this week;
  - opening next week;
  - a link to the city page.

  No digest is sent when all sections are empty. The first send is the first Friday after the provider is live, on or after 15 Oct (D-006).
- **T-44 (P0) One-tap unsubscribe.** Every message ends with "Reply STOP or tap {link}". `/[locale]/alerts/unsubscribe?t={token}` works without login: it deactivates that subscription, withdraws its `whatsapp_alerts` consent, and confirms "You won't get more alerts. [Undo]". Preferences stay editable in `/my`. A provider STOP webhook does the same.
- **T-45 (P2)** Email/SMS fallback (Product Spec D7) needs a new consent purpose and an email column. Not in the pilot.

### 3.8 Parent / school: Report an update, Request an update (P0, D-066)

- **T-50** "Report an update" appears on the city admissions page rows and in the footer (the school page entry is in the entity spec). It needs no login. The form asks for:
  - kind (wrong date or status / new admission info / school closed or moved / other);
  - class (optional);
  - details;
  - optional photo or PDF of the notice;
  - optional phone for callback.

  Submissions are rate-limited through `check_rate_limit` (`src/lib/rate-limit.ts`) and create a `verify_update` ops task. Confirmation: "Thanks. We check every report with the school before changing anything."
- **T-51** "Request an update" is a one-tap button on every "Not yet published", "Dates not announced" or stale fact. It is anonymous, deduped per device per day, and shows "Thanks — we'll ask the school" (no public counter). The counts raise the school's priority in `/ops/calls` (D-065; school-entity-page §10.1) and feed the claim pitch.

### 3.9 Ops (P0)

- **T-60** Cycle edits, the call loop and `next_check_on` follow school-entity-page §10 and D-065. The tracker adds:
  - `/ops/calls` puts pilot schools (D-007) with no current-session row first;
  - approving an admission cycle or notice is what triggers alerts (T-42);
  - school-admin edits covered by D-084 publish immediately and trigger alerts, with an ops audit within 24 h.
- **T-61** `/ops` home shows alert health for the last 24 h: queued, sent, failed, clicked (M2).

## 4. Data

**Reads (app):** `api.public_school_admissions` only, joined in adapters with `api.public_schools`, `api.public_school_boards` and `api.public_seat_status` (N-10).

**View change (this repo, `db/views/020_public_school_admissions.sql`).** `CREATE OR REPLACE VIEW` can only **append** columns and redefine existing ones. Keep the 19 current columns in order and redefine `days_to_close` in IST:

```sql
-- inside the existing select list:
  case when ac.closes_on is not null
       then ac.closes_on - (now() at time zone 'Asia/Kolkata')::date end as days_to_close,
-- appended:
  ac.id as cycle_id, s.school_code, s.locality_id,
  ac.results_on, ac.dob_from, ac.dob_to, ac.documents_required, ac.notice_url,
  ac.seats_total, ac.source_type, ac.verification_status, ac.updated_at,
  case
    when ac.status in ('open','closing_soon') and ac.closes_on is not null
         and ac.closes_on < (now() at time zone 'Asia/Kolkata')::date then 'closed'
    when ac.status in ('open','closing_soon') and ac.closes_on is not null
         and ac.closes_on - (now() at time zone 'Asia/Kolkata')::date between 0 and 7 then 'closing_soon'
    when ac.status = 'closing_soon' then 'open'
    else ac.status::text
  end as display_status
```

Keep the `where` gate (`verification in ('ops_verified','school_verified')`) until every read site uses N-03's `verification_status`. Then switch to `ac.verification_status = 'verified'`; that swap is a view change, not destructive. Also:
- apply with `pnpm db:views --confirm`;
- update the Zod contract;
- run `pnpm verify:views` and `pnpm db:types`;
- add `api.public_exam_admissions`'s current SQL to `db/views/` to end the drift.

A current-session filter lives in the adapter (`academic_year = currentSession()` in `src/lib/grades.ts` or a new `src/lib/session-year.ts`). `getAdmissionDeadlinesBySchoolId` must filter to the current session and to `display_status` not in (closed, cancelled, results_out) before picking the soonest date.

**Additive DDL requests to the data session (D-091), collected in `docs/spec/data-requests.md` (R-05, R-06):**

```sql
alter table alert_subscriptions
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid() unique,
  add column if not exists locality_ids integer[] not null default '{}';
alter table alert_deliveries
  add column if not exists channel text not null default 'whatsapp',
  add column if not exists language text;
create unique index if not exists alert_deliveries_dedupe
  on alert_deliveries (subscription_id, admission_cycle_id, kind);
create table if not exists alert_runs (id smallint primary key default 1 check (id = 1),
  audit_watermark bigint, last_digest_on date);
alter table update_reports
  add column if not exists kind text not null default 'wrong_fact'
    check (kind in ('wrong_fact','new_info','closed_or_moved','other','request_update')),
  add column if not exists class_code text, add column if not exists academic_year text,
  add column if not exists field text, add column if not exists device_hash text;
```

`next_check_on`, `previous_cycle_id` and `announced_at` on `admission_cycles` are already requested in school-entity-page §6.1. "Rolling" is **not** a new enum value; it is `open` with `closes_on is null`.

**Functions and roles (this repo, `supabase/migrations/`, non-destructive):**
- `submit_update_report(p_school_code, p_kind, p_class_code, p_message, p_contact, p_device_hash)`: SECURITY DEFINER, checks the rate limit, inserts. `GRANT EXECUTE` to anon and authenticated. This avoids re-granting raw INSERT on `update_reports`.
- `unsubscribe_alert(p_token uuid)`: SECURITY DEFINER. Sets `active=false` and sets `withdrawn_at` on the matching consent row. `GRANT EXECUTE` to anon.
- An `alerts_service` login role (same pattern as `payments_service`, `20260925102635`), EXECUTE only on:
  - `alerts_due(p_now timestamptz)`: returns deliverable (subscription, cycle, kind, template vars) rows. It applies consent, `active`, quiet hours, the daily cap and dedupe.
  - `record_alert_delivery(...)`.

  The Vercel cron route `/api/cron/alerts` (secret-checked; `vercel.json` `crons`, every 15 min) and `/api/cron/digest` use `src/lib/db/alerts-role.ts` with `DATABASE_URL_ALERTS`. The app still never holds the service-role key (N-11).
- The `unsubscribeAlert` fix in `/my` (withdraw only when no active subscription remains) is app code only.

**Destructive (needs Prav's yes):** migrating stored `closing_soon` rows to `open` (school-entity-page §6.4). This spec does not depend on it, because `display_status` handles both.

## 5. Rules

- **Trust:**
  - Only approved cycles appear (D-025); unknowns show "Not yet published" (D-022, D-049).
  - Stale facts are flagged, never hidden (D-026).
  - Red is used only for 0–7-day deadlines (D-050).
  - Alerts and digests never contain unapproved values.
  - No "best" or ranking language on the city list, and ordering is by deadline, never paid (N-13, D-089).
  - The RTE pages carry "SchoolOye does not sell admissions or RTE seats; apply only on the official portal."
- **Privacy (DPDP):**
  - Alerts store phone, city, classes, areas and schools, with no child data (D-067, N-09).
  - WhatsApp needs an active `consents` row (`whatsapp_alerts`, versioned, withdrawable, D-069) and `whatsapp_opt_in_at`.
  - The age checker processes the DOB only in the browser.
  - Report-an-update contact numbers are staff-only and are never shown to schools.
  - Attachments are stored privately and deleted 90 days after the report is resolved.
- **SEO:** see `docs/guidelines/seo-geo.md`. Specific to this feature:
  - indexable: the unfiltered city admissions page (a D-053 landing page), plus the RTE guides and `/tools/age-eligibility` as service pages with real content (D-108); filtered variants stay `noindex`;
  - no invented schema or FAQ (D-046, D-047);
  - JSON-LD `Event` belongs on school pages (D-045), not here;
  - the `.ics` and `eligibility.json` routes are `noindex` and disallowed in `robots.ts`;
  - the city page's real `lastModified` is `max(updated_at)` of its cycles, which goes in the city sitemap (D-044).
- **Caching:** cycle data is cached with `cacheTag('city:<slug>')` and revalidated by the existing DB webhook. Grouping and countdowns are computed per request in IST in a streamed segment, never baked into the static shell (screen-map note).

## 6. Acceptance criteria

- [ ] `/en/jaipur/admissions` groups cycles correctly for a fixture set covering every row of the §3.1 table, including closes_on today (red, "Last date today"), yesterday (derived Closed) and null (rolling).
- [ ] Between 00:00 and 05:29 IST, `days_to_close` and the margin agree with the IST date (unit test on `admissionDisplayState` plus a view check).
- [ ] Filtered URLs return `noindex`; the unfiltered page is indexable only when `SITE_INDEXABLE` is on.
- [ ] A school whose older cycle closed but whose current cycle is open shows Open on city cards.
- [ ] The age checker makes no request containing the DOB (Playwright network assertion). Buckets (a)–(d) render. A state-rule result shows its label and source.
- [ ] Alerts sign-up offers the class codes present in `class_levels`. Following a second school keeps the first one in `school_ids`.
- [ ] With the provider stubbed, approving a cycle date change produces exactly one `alert_deliveries` row per matching subscriber within 15 min. Re-running the job creates no duplicates. Nothing is sent 21:00–08:00 IST, and a deadline-day reminder is delivered at 08:00 IST (D-110).
- [ ] The digest for a subscriber with no matching items is not sent.
- [ ] The unsubscribe link works in a logged-out browser. It sets `active=false`, withdraws that consent, and a further delivery attempt returns nothing from `alerts_due`.
- [ ] Report an update works logged out, is rate-limited, and creates an ops task. Request an update increments the count once per device per day.
- [ ] `.ics` imports into Google Calendar, and a changed `closes_on` updates the existing event rather than duplicating it.
- [ ] `pnpm verify:views`, `typecheck`, `lint`, `test`, and the Playwright a11y smoke pass. The city admissions page stays within the D-051 budget.

## 7. Deferred and open

**Deferred**
- Two-way WhatsApp bot: P1, after the provider is live.
- Email/SMS fallback: P2.
- A closed-vocabulary documents taxonomy (N-04), replacing free-text dedupe: after the season, if checklist mismatches are reported.
- "Last year" hints: when `previous_cycle_id` is populated.
- Delhi nursery hub: its own spec (D-080).
- A general notification platform: only when a second alert type exists beyond admissions and exams (decisions.md Deferred).

**Settled since 27 Sep**
- RTE modelling: settled by D-099. The pilot shows state RTE dates as sourced guide content, not modelled as an `exams` row; RTE updates go out in the city digest.
- Digest day and time: settled by D-098. Weekly city digest is Friday 18:00 IST.
- Reminder offsets: settled by D-098. Reminders are 3 days before `closes_on` and deadline-day morning (08:00 IST), not 7 days and 1 day. `school-entity-page.md` §9.1 already matches.

**Open (not settled in decisions.md)**
1. WhatsApp provider (D-095, open). This blocks all sending. Sign-up and storage ship on 15 Oct regardless.
