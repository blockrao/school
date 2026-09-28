# School entity page — Developer Spec

**Status:** approved for build (pilot) · **Owner:** Claude Code (build), Prav (approve) · **Updated:** 27 Sep 2026
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** D-013, D-014, D-023, D-024, D-031, D-040, D-042, D-045, D-052, D-080–D-090, D-098, D-100, D-103, D-107, D-108, D-109 · **Guidelines:** `docs/guidelines/seo-geo.md`, `docs/guidelines/content-and-trust.md`


> **URLs changed (28 Sep 2026, D-121).** The school page is now `/school/{slug}` and discovery lives under `/schools/{state}/{city}/{locality}`; English has no `/en` prefix. `docs/spec/urls-and-routing.md` is the frozen authority for every URL, slug and redirect rule. Older `/[locale]/[city]/[slug]-[school_code]` references below describe the previous scheme; those URLs were never indexed and now 404 (D-122).

## 1. Overview

**Goal:** make each SchoolOye school page the official, school-verified, source-backed record for that school. It has to be the page parents, search engines and AI engines trust for admissions and fees questions, and the one place schools update.

**This is a delta spec.** A lot already exists and is not rebuilt here:

- **Database:** Supabase `ybevzpryuvgxclkhdjld`. 10,642 schools; `field_provenance` (85k rows); `sources` with `trust_rank`; `source_records`; `school_identifiers`; `admission_cycles`; `admission_notices` (with AI extraction + review); `fee_items`; `seat_status`; `school_claims`; `school_members`; `ops_tasks`; `update_reports`; `alert_subscriptions`/`alert_deliveries`; `consents`; `school_posts`; `school_slug_history`.
- **App** (`blockrao/school`): canonical school page at `/[locale]/[city]/[slug]-[school_code]` (Overview only), `index.md` markdown twin, JSON-LD, `FreshnessLine`/`NotYetPublished` trust components, `/for-schools/claim`, `/portal`, `/ops` queues, alerts, sitemaps, `robots.ts` (currently `SITE_INDEXABLE` off).
- **Rules** already in `CLAUDE.md` and `docs/spec/data-and-trust.md`: the app reads only `api.*` views; the data repo owns tables; this repo owns views, grants, RLS and publishing rules; no star ratings or paid ranking; "Not yet published" instead of guesses.

This spec adds what is missing to meet the strategy: the admissions/fees modules, parent-reported fees with school verification, per-field source precedence, the indexing gate, claim v2 with the school website widget, the ops call loop, change monitoring and the SEO/AI additions.

**Pilot scope:** Jaipur (live) and Gurugram (blocked on data, see §13). Target: 150 Jaipur + 100 Gurugram schools researched; 30–50 claimed per city by Feb 2027.

**Dates** (aligned to the Admissions Tracker doc): tracker live **15 Oct 2026**, concierge **1 Nov 2026**.

### Locked decisions for this spec

These are recorded in `docs/decisions.md` (D1→D-040, D2→D-042, D3→D-013, D4→D-014, D5→D-023, D6→D-090, D7→D-052, D8→D-009/D-088, D9→D-086, D10→D-031, D11→D-081); the register wins if they ever differ.

| # | Decision | Notes |
| --- | --- | --- |
| D1 | Canonical URL stays `/[locale]/[city]/[slug]-[school_code]` | Already shipped; supersedes the `/school/{slug}` idea in the strategy doc |
| D2 | Admissions and fees get **one evergreen sub-URL each** (`/admissions`, `/fees`) showing the current session; past sessions archived under `/admissions/2026-27` | Links and ranking accumulate on one URL |
| D3 | **Fees come from parents** (UGC with evidence), published only as "parent-reported" ranges once thresholds are met, and verified or corrected by the school. Official fee documents (school circular, Haryana Form VI) are shown alongside as evidence or used as a cross-check. | New; §5 |
| D4 | Admissions data comes from the web first, then **ops phone calls**, then the school portal after claim | §10 |
| D5 | Source precedence is **per field type**, not one global `trust_rank` | §3 |
| D6 | A page is **indexable** only with a verified current-session admissions record (any status, including "not announced") | Pilot rule against scaled-content risk; §11 |
| D7 | Unclaimed pages render as "Compiled from public records", with no logo and no "Official" wording | §7 |
| D8 | No reviews, ratings or scores on the school page in v1. Third-party rankings stay on editorial pages only | Consistent with the existing trust rules |
| D9 | English first; URL structure and `name_hi` stay ready for `/hi` | Existing |
| D10 | Organisation → brand → campus modelled now (minimal) | §4 |
| D11 | Brand is "SchoolOye" everywhere, including the JSON-LD `propertyID` | Fixes the "Schooloy" leftovers |

**Related docs:** Strategy & Research (Official School Entity Page) · Competitor Teardown · Data & Technical Architecture Foundation · School Directory Product & Data Spec · Admissions Tracker & Concierge · Platform Audit (Sep 2026). Where this spec differs from an older doc, this spec wins for the school page, and §14 lists every such change.

## 2. Architecture

### The record is the product; pages are views of it

```text
 SOURCES                          OBSERVATIONS                RESOLVED ENTITY            VIEWS (api.*)          SURFACES
 official registries  ─┐                                                                                   
 school website/crawl ─┤        field_provenance       ──►  schools / cycles /  ──►  api.public_*      ──►  school page + /admissions + /fees
 ops phone calls      ─┼──►  (one row per value     precedence  fee_items /                publishing rules       index.md twin, JSON-LD
 school portal        ─┤     per source per time)   + review   seat_status                (views own gating)     city/hub pages, compare
 parent fee reports   ─┘     fee_reports                                                                        widget/embed, alerts, sitemaps
```

- **Observations are append-only.** Every value from every source is stored with its source, evidence and time. They are never overwritten.
- **Resolved values** (the columns on `schools`, `admission_cycles`, `fee_items`) are the current answer, chosen by the precedence rules in §3 or by a human reviewer. Every change to a resolved value writes `audit_log`, which already exists.
- **Publishing rules live in views**, not in React. Views decide which resolved fields a parent may see and with which label.
- **Every surface is generated from the views:** the HTML page, the markdown twin, JSON-LD, the snapshot sentence, the widget, sitemaps and alert messages. Nothing is hand-written per school.

### Repo responsibilities (unchanged; restated for this work)

| Work | Owner |
| --- | --- |
| New tables/columns/enums (§6 DDL), crawlers, extraction jobs, change monitor | **Data repo / data sessions** (the frontend repo never alters tables) |
| `api.*` views, grants, RLS for app access, publishing rules, `/ops` + `/portal` write paths (Server Actions), pages, widget, SEO | **Frontend repo** `blockrao/school` |

### Modules and build order

| Order | Module | What it covers | Section |
| --- | --- | --- | --- |
| 1 | **E — Verification & provenance** | Observation model gaps, precedence rules, labels, conflicts, review | §3 |
| 1 | **C — Admissions & fees** | Session × class records, parent fee reports, publishing thresholds | §5 |
| 2 | **A — Identity** | Organisation/brand/campus, identifiers, location, contact | §4 |
| 2 | **D — Page** | Overview, `/admissions`, `/fees`, snapshot, states | §7 |
| 3 | **Claim & portal v2**, parent features, ops tooling | Supply side, demand side, operations | §8–§10 |
| 3 | **F — SEO/AI layer** | Metadata, JSON-LD additions, indexing gate, sitemaps, IndexNow, widget links | §11 |
| later | **B — School intelligence data** | Facilities detail, results, staff, student life | §14 (deferred) |

## 3. Module E — Verification & provenance

### 3.1 What exists and what's missing

`field_provenance` already stores one row per (entity, field, value, source), with `evidence_url`, `verified_by`, `verified_at` and `licence_class`. The legacy `verification` column and the new `source_type` + `verification_status` columns both live on `schools` and `admission_cycles` (split committed 26 Sep).

**Gaps this spec closes:**

1. No **observed-at time**. `created_at` is when we ingested the value, not when the source said it (e.g. the date on a circular).
2. No **scope**. A value for the 2027-28 Nursery cycle can't be told apart from 2026-27.
3. No **review state**. A candidate from AI extraction and an accepted value look identical.
4. No **method**. A crawl, a phone call and a portal edit from the same source group are indistinguishable.
5. Precedence is one global `sources.trust_rank`. It must vary **per field family** (D5).
6. Two verification schemes coexist. The new pair becomes authoritative; the legacy column is retired after read sites migrate (§6.4).

### 3.2 Source groups

Every `sources` row gets a `source_group`. Mapping of today's sources:

| Group | Sources (id) | Shown to parents as |
| --- | --- | --- |
| `school_portal` | 1 school\_portal | ✓ Verified by school |
| `schooloye_call` | 2 ops\_call | ✓ Confirmed with school by phone |
| `registry` | 4 saras, 11 saras\_archive, 6 rajpsp, 7 delhi\_doe, 9 cisce, 12 haryana\_edu\_2026\_ext, 8 haryana\_edu (stale, rank last), 5 udise (D-082: directory facts only, lowest official rank) | Official record · {registry name} |
| `school_published` | 3 school\_website, *new:* school fee circular / admission notice documents | From school's official {website / notice} |
| `schooloye_research` | 17 ops\_web\_verified | Checked by SchoolOye |
| `parent` | 10 parent\_report | Reported by parents (fees only, §5) |
| `lead_only` (never displayed) | 16 ai\_web\_research, 18 cforerankings (editorial pages only), 13 jaipurcircle\_localities and 14 geonames (reference/geo only) | — |

**Competitor aggregators are never a source.** Researchers may use them privately as leads. Nothing is stored with an aggregator as `source_id`.

### 3.3 Precedence per field family

Highest first. Within a group, the newer `observed_at` wins. A value corroborated by two independent groups gets `verification_status = verified`.

| Field family | Fields | Precedence |
| --- | --- | --- |
| `affiliation` | board, affiliation no., validity, recognition | registry → school\_portal → schooloye\_call → school\_published |
| `directory` | legal name, address, pincode, geo, classes, gender, medium, established, management | school\_portal → schooloye\_call → registry (current) → school\_published → schooloye\_research |
| `contact` | phones, emails, website, admission office hours | school\_portal → schooloye\_call → school\_published → registry |
| `admissions` | cycle status, dates, form mode/URL, form fee, age window, documents, process, seats | school\_portal (current session) → schooloye\_call → school\_published (reviewed notice) → registry (RTE seats and dates only). **Never parent.** |
| `fees` | fee heads, amounts, frequency | school\_portal with document → school\_published fee document → parent (aggregated, §5). Haryana Form VI is a **ceiling check**, not the displayed fee |
| `school_voice` | about, principal message, photos, logo | school\_portal only. Before claim: a short factual description written by SchoolOye from verified fields |

Precedence is stored as data (`field_families`, `source_precedence` tables, §6), so the data repo's resolver, `/ops` and the views all read the same rules.

### 3.4 Resolution and review

- **Automatic resolution** (data repo job, on new observations) runs only for `affiliation`, `directory` and `contact`, and only when the winning observation comes from registry, school\_portal or schooloye\_call.
- **Human review is mandatory** for everything in `admissions` and `fees`, and for any value from `school_published` or AI extraction. These arrive as `review_state = candidate` plus an `ops_tasks` row (`verify_notice` / `verify_record`).
- **Conflict:** two eligible observations in the same scope disagree (dates differ, amounts differ by more than 5%, text differs after normalisation). The system sets `verification_status = conflicting`, adds a `data_quality_flags` row and opens an ops task. The page keeps showing the higher-precedence value with a "Re-checking" marker. It **never shows two competing dates**.

### 3.5 Freshness SLAs (replaces the single global 7-day rule)

Decided in D-087 (replaces the old global 7-day rule in `CLAUDE.md` and the Tracker's 14 days). Per family:

| Family | Stale after | Notes |
| --- | --- | --- |
| admissions (status open or closing) | 3 days | Matches the Tracker rule: re-check every 3 days within 7 days of a deadline |
| admissions (upcoming / not announced) | 14 days |  |
| fees | end of session, or 180 days | Plus a flag when a newer parent report disagrees |
| contact | 90 days |  |
| directory, affiliation | 365 days, or when the registry snapshot changes |  |

A stale fact keeps rendering with the stale marker. It is never hidden, because hiding looks like missing data.

### 3.6 Parent-facing trust labels

One line per fact, rendered by the existing `FreshnessLine`:

- `✓ Verified by school · 2 Oct 2026`
- `✓ Confirmed with school by phone · 2 Oct 2026`
- `Official record · CBSE affiliation list · checked 24 Sep 2026`
- `From the school's admission notice · 1 Oct 2026` (links to the document)
- `Reported by 4 parents · 2027-28 · not yet verified by school`
- `Calculated by SchoolOye from the fee items above`
- `Not yet published` / `Not confirmed for 2027-28 · last year: forms opened 14 Nov`

Every label links to the page's **Sources & verification** section, which lists each source, its date and the evidence link.

## 4. Module A — Identity

### 4.1 Entity keys

| Key | Where | Public? | Use |
| --- | --- | --- | --- |
| `schools.id` (UUID) | exists | internal | Joins, FKs |
| `schools.school_code` (6-digit) | exists | **yes** | URL suffix; JSON-LD `identifier` "SchoolOye School ID"; never reused, even after a merge |
| UDISE code | `school_identifiers` (`udise`) | internal (D-082) | Primary dedupe key |
| Board affiliation / school code | `school_affiliations`, `school_identifiers` | yes | JSON-LD `identifier`, verification anchor |
| Google place id | *new* `school_links` (`gbp`) | internal id, public Maps URL | `sameAs` and NAP cross-check. Storing the place id is allowed; don't cache other Places content |

**Dedupe rule** (data repo resolver): match on UDISE, else on board affiliation no., else on normalised name + pincode + distance under 300 m. The last case only goes to a review queue; it is never auto-merged. A merge keeps the older `school_code` and 301-redirects the other one through `school_slug_history`.

### 4.2 Organisation → brand → campus (D10)

Each `schools` row is a **campus**, i.e. one physical school with one admission office. New:

- `organizations(id, kind, name_en, name_hi, slug, website, parent_id)`, with `kind` in `managing_body` (trust/society/company) or `brand` (DPS, Presidium, Jayshree Periwal Group).
- `school_organizations(school_id, organization_id, role)`, with `role` in `brand` or `managing_body`.
- `schools.campus_label` ("Jagatpura", "Sector 45") and `schools.aliases text[]` (JPIS, JPGS, DPS Jaipur).

The page uses these for:

- the H1 ("Jayshree Periwal Global School, Jagatpura");
- an "Other campuses of {brand}" rail;
- JSON-LD `parentOrganization`;
- disambiguation in search and in the snapshot sentence.

Brand pages (`/[city]/brand/...`) are **not** built in the pilot.

### 4.3 Names and slugs

- `name_en` = the name the school uses publicly. The legal/registry name goes in `field_provenance` and shows under "Sources & verification" when it differs.
- Slug = display name + campus/locality. It changes only through `school_slug_history` (old URL 308s to the new one; `school_code` is unchanged).
- Existing duplicate slugs (204 schools) are harmless, because resolution is by `school_code`. No action needed.

### 4.4 Location

- Uses the existing `location` (PostGIS), `geocode_precision`, `locality_id`, `city_id`. An indexable page needs `geocode_precision` at pincode/locality or better (D-109). `rooftop` or `street` precision is required only for the "distance from" feature.
- **Gurugram blocker:** 534 Gurugram-district schools have `city_id = NULL`. The data repo must assign city and locality before any Gurugram page can reach L2 (§13, M0).

### 4.5 Contacts and links

New tables replace the untyped `phone[]` / `email[]` for display. The arrays stay as legacy until the views migrate.

- `school_contacts(school_id, purpose, kind, value, is_public, source_id, verified_at)`:
  - `purpose` in `main`, `admissions`, `transport`, `accounts`
  - `kind` in `phone`, `email`, `whatsapp`
  - `is_public` follows the UDISE contact rule already recorded in `sources.licence_note`, plus explicit school consent at claim.
- `school_links(school_id, kind, url, source_id, verified_at)`, with `kind` in `website`, `gbp`, `admission_portal`, `facebook`, `instagram`, `youtube`, `linkedin`, `wikidata`, `board_record`. This feeds JSON-LD `sameAs` and the "Official links" block.
- **Admission office hours** are stored as `school_contacts` metadata (`hours jsonb`) on the `admissions` purpose row.

## 5. Module C — Admissions & fees

### 5.1 Admissions: one record per school × session × class

`admission_cycles` already covers most fields: status, `form_mode`, `opens_on`/`closes_on`/`results_on`, `dob_from`/`dob_to`, `registration_fee`, `documents_required`, `form_url`/`notice_url`, `seats_total`, `application_steps`, `eligibility_notes`, `late_fee_amount`.

**Additions:**

| Column | Why |
| --- | --- |
| `test_on`, `interaction_on`, `fee_deposit_by` (date) | Full timeline on the page and in alerts |
| `class_label_school` (text) | The school's own name for the class ("Prep", "KG1"). `class_code` stays the normalised `class_levels` code |
| `rte_seats` (int), `rte_source_id` | From the RTE portals (Rajasthan PSP, Haryana UJJWAL) |
| `next_check_on` (date) | Drives the ops call queue (Tracker doc field) |
| `previous_cycle_id` (uuid) | Powers "Last year: forms opened 14 Nov" and the expected-month hint |
| `announced_at` (timestamptz) | When the school announced it, not when we learned it |

**Status rules:**

- Store only what was announced: `not_announced`, `upcoming`, `open`, `closed`, `results_out`, `postponed`, `cancelled`. "Rolling" admissions are `open` with no `closes_on` (no new enum value).
- `closing_soon` is **derived in the view**, not stored: `open` and `closes_on` within 7 days, computed in IST, rendered in margin red per `CLAUDE.md`. Existing stored `closing_soon` rows are migrated to `open` (data repo; destructive-type change, needs approval).
- **Session rollover:** when a session's cycles are all closed or results are out, the data repo creates next-session rows for the same classes with `not_announced`, `previous_cycle_id` set, and `next_check_on` = previous `opens_on` minus 21 days.

**Eligibility:** `dob_from`/`dob_to` per class. Where the school hasn't published them, fall back to the state rule (Haryana: Class 1 = 6+ strict from 2026-27) labelled "State rule, not confirmed by school". The existing `/tools/age-eligibility` reuses the same function.

### 5.2 Fees: resolved fee items

`fee_items` exists (`component`, `amount_min`/`amount_max`, `frequency`, `verification`) and is empty. **Additions:**

| Column | Values |
| --- | --- |
| `head` (replaces free-text `component` for display) | `registration`, `application_form`, `admission`, `security_deposit`, `tuition`, `composite`, `annual_charges`, `development`, `activity`, `exam`, `technology`, `transport`, `meals`, `boarding`, `books_uniform`, `other` |
| `variant` | `day`, `day_boarding`, `boarding` (transport zones later) |
| `mandatory`, `refundable` | bool, nullable = unknown |
| `basis` | `school_confirmed`, `official_document`, `parent_aggregate` |
| `report_count`, `evidence_count` | For parent aggregates |
| `evidence_document_id` | Link to the circular / Form VI / school upload |
| `effective_from` | date |

**Computed in the view** (labelled "Calculated"):

- **First-year cost** = one-time heads + recurring heads annualised (monthly × 12, quarterly × 4, term × terms).
- **Recurring annual.**
- **Monthly equivalent.**

Totals are computed only when all *mandatory* heads for that class come from the same `basis`. Otherwise the page shows "Partial: 3 fee heads reported" and no total.

### 5.3 Parent fee reports (D3)

**New table `fee_reports`:**

- **Who and what:** `id`, `school_id`, `academic_year`, `class_code`, `variant`, `reporter_id` (auth user, verified phone required).
- **Relationship:** `current_parent`, `admitted_this_session`, `applied_not_joined`.
- **Evidence:** `evidence_kind` (`receipt`, `fee_circular`, `admission_form_fee_page`, `notice_photo`, `none`), `evidence_path` (private storage bucket), `redaction_status` (`pending`, `redacted`, `not_needed`).
- **Figures:** `items jsonb` as `[{head, amount, frequency}]`, `stated_total_first_year`, `notes`.
- **Moderation:** `moderation_status` (`pending`, `accepted`, `rejected`, `needs_info`), `moderation_reason`, `moderated_by`, `moderated_at`.
- **Anti-abuse and consent:** `consent_id` (FK `consents`, new purpose `fee_report`), `fingerprint_hash`, `created_at`.

**Intake rules:**

- One report per reporter × school × session × class. Edits create a new version.
- Evidence images are **redacted before any human sees them unredacted outside ops**. Redaction removes the child's name, admission/roll number, parent name and phone. Only ops (RLS `is_staff`) can open the originals. Originals are deleted 30 days after acceptance; the redacted copy is kept.
- The child is never linked: no `child_id`, no DOB. Class and session only.

**Aggregation into `fee_items` (`basis = parent_aggregate`), per head:**

- Publish when there is **≥1 accepted report with evidence**, **or ≥3 accepted reports without evidence** from independent reporters whose amounts agree within 10%.
- Display the min–max range of accepted reports for the session. Outliers beyond 1.5× IQR are excluded and flagged to ops.
- Label: `Reported by N parents (M with receipts) · 2027-28 · not yet verified by school`.

**School verification (portal, §8). Three actions per fee head or per class:**

1. **Verify** → the school-confirmed item becomes the displayed value ("✓ Verified by school"). Parent reports are kept as history.
2. **Correct** → requires a fee circular upload. The school figure is displayed. If accepted parent reports *with evidence* differ by more than 10%, ops reviews before publishing, and may add "Some parents reported different amounts for 2027-28" (no figures).
3. **Respond** → a public note under the fee block (max 280 chars, e.g. "Transport optional, billed separately").

The school **cannot delete** parent reports. It can dispute them, which sends them to ops review.

**Official documents alongside:** a school's own published fee circular (`school_published`) is displayed as "From the school's fee circular" and outranks parent aggregates. **Haryana Form VI** is used only as an **internal ceiling check** in the pilot: any fee above the declared Form VI amount raises an ops flag. It is not shown publicly until legal review (D-013).

## 6. Database changes

Three kinds of change, owned by different repos:

- **6.1 Additive table changes:** request to the data repo, ready to run.
- **6.2 Views and grants:** frontend repo, `db/views` + `supabase/migrations`.
- **6.4 Destructive items:** need Prav's explicit yes first (per `CLAUDE.md`).

Types follow the live schema: `schools.id uuid`, `sources.id smallint`, `field_provenance.id bigint`.

### 6.1 Additive DDL (data repo)

```sql
-- 3.1 provenance gaps
alter table field_provenance
  add column if not exists observed_at   timestamptz,
  add column if not exists scope_key     text,        -- e.g. '2027-28:nursery' or '2027-28:nursery:day'
  add column if not exists method        text check (method in
    ('registry_import','crawl','ai_extraction','ops_call','ops_research','school_portal','parent_report')),
  add column if not exists review_state  text not null default 'accepted' check (review_state in
    ('candidate','accepted','rejected','superseded')),
  add column if not exists reviewed_by   uuid,
  add column if not exists reviewed_at   timestamptz,
  add column if not exists note          text;
create index if not exists fp_entity_field_scope on field_provenance (entity_table, entity_id, field, scope_key);
create index if not exists fp_candidates on field_provenance (review_state) where review_state = 'candidate';
-- named review_state, not review_status, to avoid clashing with the existing review_status enum (pending/approved/edited/rejected/needs_triage)

-- 3.2 / 3.3 source groups + per-family precedence
alter table sources add column if not exists source_group text check (source_group in
  ('school_portal','schooloye_call','registry','school_published','schooloye_research','parent','lead_only'));
create table if not exists field_families (
  entity_table text not null, field text not null, family text not null check (family in
    ('affiliation','directory','contact','admissions','fees','school_voice')),
  stale_after interval not null,
  primary key (entity_table, field));
create table if not exists source_precedence (
  family text not null, source_group text not null, rank smallint not null,
  displayable boolean not null default true,
  primary key (family, source_group));

-- 4.2 organisation / brand / campus
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('managing_body','brand')),
  name_en text not null, name_hi text, slug text unique, website text,
  parent_id uuid references organizations(id),
  created_at timestamptz not null default now());
create table if not exists school_organizations (
  school_id uuid not null references schools(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role text not null check (role in ('brand','managing_body')),
  source_id smallint references sources(id),
  primary key (school_id, organization_id, role));
alter table schools
  add column if not exists campus_label text,
  add column if not exists aliases text[] not null default '{}',
  add column if not exists index_state text not null default 'noindex'
    check (index_state in ('noindex','indexable','suppressed')),
  add column if not exists index_state_reason text;

-- 4.5 contacts + links
create table if not exists school_contacts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  purpose text not null check (purpose in ('main','admissions','transport','accounts')),
  kind text not null check (kind in ('phone','email','whatsapp')),
  value text not null, hours jsonb, is_public boolean not null default false,
  source_id smallint references sources(id), verified_at timestamptz,
  unique (school_id, purpose, kind, value));
create table if not exists school_links (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  kind text not null check (kind in ('website','gbp','admission_portal','facebook','instagram',
    'youtube','linkedin','wikidata','board_record')),
  url text not null, external_id text, source_id smallint references sources(id), verified_at timestamptz,
  unique (school_id, kind, url));

-- 5.1 admissions
-- 'rolling' is modelled as status = 'open' with closes_on is null (no new enum value)
alter table admission_cycles
  add column if not exists test_on date,
  add column if not exists interaction_on date,
  add column if not exists fee_deposit_by date,
  add column if not exists class_label_school text,
  add column if not exists rte_seats integer,
  add column if not exists rte_source_id smallint references sources(id),
  add column if not exists next_check_on date,
  add column if not exists previous_cycle_id uuid references admission_cycles(id),
  add column if not exists announced_at timestamptz;
create index if not exists ac_next_check on admission_cycles (next_check_on) where next_check_on is not null;

-- 5.2 fee items
alter table fee_items
  add column if not exists head text check (head in ('registration','application_form','admission',
    'security_deposit','tuition','composite','annual_charges','development','activity','exam',
    'technology','transport','meals','boarding','books_uniform','other')),
  add column if not exists variant text not null default 'day' check (variant in ('day','day_boarding','boarding')),
  add column if not exists mandatory boolean,
  add column if not exists refundable boolean,
  add column if not exists basis text check (basis in ('school_confirmed','official_document','parent_aggregate')),
  add column if not exists report_count integer not null default 0,
  add column if not exists evidence_count integer not null default 0,
  add column if not exists evidence_document_id uuid,
  add column if not exists effective_from date;

-- 5.3 parent fee reports
alter type consent_purpose add value if not exists 'fee_report';
create table if not exists fee_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  academic_year text not null, class_code text not null references class_levels(code),
  variant text not null default 'day',
  reporter_id uuid not null,                               -- auth.users.id, verified phone required
  relationship text not null check (relationship in ('current_parent','admitted_this_session','applied_not_joined')),
  evidence_kind text not null check (evidence_kind in ('receipt','fee_circular','admission_form_fee_page','notice_photo','none')),
  evidence_path text, evidence_redacted_path text,
  redaction_status text not null default 'pending' check (redaction_status in ('pending','redacted','not_needed')),
  items jsonb not null,                                    -- [{head, amount, frequency}]
  stated_total_first_year numeric, notes text,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','accepted','rejected','needs_info')),
  moderation_reason text, moderated_by uuid, moderated_at timestamptz,
  consent_id bigint references consents(id), fingerprint_hash text,
  supersedes_id uuid references fee_reports(id),
  created_at timestamptz not null default now());
create unique index if not exists fee_reports_one_live
  on fee_reports (reporter_id, school_id, academic_year, class_code, variant)
  where supersedes_id is null and moderation_status <> 'rejected';

-- 5.3 school responses + official documents
create table if not exists school_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  kind text not null check (kind in ('fee_circular','admission_notice','prospectus','form_vi','mandatory_disclosure','other')),
  academic_year text, storage_path text, source_url text, source_id smallint references sources(id),
  uploaded_by uuid, public boolean not null default false, created_at timestamptz not null default now());
create table if not exists fee_responses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id), academic_year text not null, class_code text,
  body text not null check (char_length(body) <= 280), author_id uuid not null,
  review text not null default 'pending', created_at timestamptz not null default now());
```

The data repo also seeds `source_group` for existing sources (§3.2), `field_families` and `source_precedence` (§3.3), and adds a `fee_evidence` private storage bucket.

### 6.2 Views (frontend repo, `db/views`)

| View | Change |
| --- | --- |
| `api.public_schools` | Replace the hard-coded source-id lists with a join to `source_precedence.displayable` per field family. Add `campus_label`, `aliases`, `index_state`, brand name/slug, public contacts and links. Expose the winning source group + `observed_at` + `verified_at` per displayed field as `fact_meta jsonb` |
| `api.public_school_admissions` | Derive `closing_soon` in IST. Add the new timeline columns and `previous_cycle` open/close dates. Keep the approval rule (`verification_status = verified` via ops or school) |
| **new** `api.public_school_fees` | `fee_items` rows by session/class/variant with basis, counts and label, plus the computed totals (§5.2). Only rows meeting the publish thresholds |
| **new** `api.public_school_sources` | Per school: source name, group, date and evidence link for every displayed fact. Powers the "Sources & verification" section and `index.md` |
| **new** `api.public_school_updates` | Approved `admission_notices` + `school_posts` + the resolved-value change log (the last 20 changes to admissions/fees fields from `audit_log`, public fields only) |
| **new** `api.public_school_documents` | `school_documents` where `public = true` |

### 6.3 Grants and RLS (frontend `supabase/migrations`)

- `anon`, `authenticated`: `select` on the new `api.*` views only.
- `fee_reports`: `authenticated` may `insert` own rows (`reporter_id = auth.uid()`) and `select` own rows. Staff get everything (`is_staff()`). **No `anon` access.** School members can't read reporter identity; they see a redacted view (`api.portal_fee_reports_for_school`, no `reporter_id` / `evidence_path`).
- `fee_evidence` bucket: owner upload; read `is_staff()` only; redacted copies get read access for school members of that school.
- `fee_responses`, `school_documents`: insert by `is_school_member(school_id)`; publish via ops review.

### 6.4 Destructive items (need explicit yes)

1. Migrate stored `admission_status = closing_soon` rows to `open` (status becomes derived).
2. After every read site uses `source_type` + `verification_status`: drop `schools.verification` and `admission_cycles.verification`, and `fee_items.verification` in favour of `basis`.
3. Drop `correction_requests` after merging it into `update_reports` (§9.3). It is currently empty.
4. Retire `phone[]` / `email[]` display reads after `school_contacts` backfill (columns kept until then).

## 7. Module D — The page

### 7.1 Routes

| Route | Content | Indexable when |
| --- | --- | --- |
| `/[locale]/[city]/[slug]-[code]` | Overview (existing, extended) | `index_state = indexable` (§11.3) |
| `…/admissions` | Current-session admissions, every class | Same gate, **and** at least one current-session cycle row published |
| `…/admissions/[yyyy-yy]` | Archived session | Indexable (history is unique content), `rel=canonical` to itself |
| `…/fees` | Current-session fees, every class and variant | At least one published `fee_items` row for the current session; otherwise it renders a "Share this year's fees" page with `noindex` |
| `…/index.md` | Markdown twin (existing), extended with admissions, fees and sources | Follows the parent page |
| `/embed/school/[code]` | Widget (§8.4) | Always `noindex`, links canonically to the Overview |

The tabs (Overview · Admissions · Fees) are **links**, per `CLAUDE.md`. Facilities, Teachers and Photos tabs are **not** built in the pilot (§14).

### 7.2 Overview: section order (mobile-first)

1. **Header**
   - H1 with display name + campus label, then locality and city.
   - Chips: board(s) · class range · co-ed/girls/boys · day/boarding · medium.
   - **Record badge**: "✓ Official record · verified by school on {date}" (claimed + school-verified) **or** "Compiled by SchoolOye from public records · {date}" (unclaimed).
   - Brand line: "Part of {brand}" with a link to the other campuses rail.
2. **Snapshot sentence** (§7.4). Plain HTML, first paragraph under the H1.
3. **Admission status card** for the parent's selected class + session. Class picker = links with `?class=nursery`; the choice is remembered in a cookie; the canonical URL has no param.
   - Contents: `StatusPill` + `DeadlineMargin` (the countdown streams server-side, IST), key dates, form fee, **Official form** button (only if `form_url` exists), **Get alerts** (primary CTA), trust line.
   - Empty state: "2027-28 admissions not announced yet · last year forms opened 14 Nov 2025 · Get an alert when they open".
4. **Eligibility**: enter the child's DOB, get ✓/✗ per class. Computed client-side, never stored (§12). Falls back to the state rule, labelled.
5. **Fees summary** for the selected class: first-year cost (or a range) + basis label + "View full fee structure" → `/fees`. Empty state: "Fees for 2027-28 not reported yet · Know the fee? Share it (takes 2 min)".
6. **Quick facts** table: board + affiliation no. + validity, established, management, gender, medium, class range, session months, timings (when known), campus area (when known). Each fact has a `FreshnessLine`; unknown facts show `NotYetPublished`.
7. **About**: "From the school" (claimed) or "About this school" (a factual summary written by SchoolOye from verified fields, ≤ 80 words, no adjectives such as "best" or "premier").
8. **Updates**: official notices + recent changes ("Last date extended to 15 Dec · changed 3 Dec"). Hidden when empty.
9. **Location & contact**: MapLibre map (existing lazy island), address, admissions phone/email/hours, official links. Phone is **never gated**.
10. **Documents & official sources**: affiliation record link, CBSE mandatory disclosure, fee circular, admission notice (`api.public_school_documents`).
11. **Other campuses** of the brand (if any), **Similar schools nearby** (existing; add each school's admission status pill).
12. **Sources & verification**: every displayed fact with source, date and evidence link, plus "Report an update".
13. **For schools**: unclaimed → "Is this your school? Claim this record, it's free"; claimed → "Managed by the school · last updated {date}".

**Removed from the current page for the pilot:** the teachers section, unless the school has linked teachers (keep, but only when it has rows); the sidebar enquiry form moves below the admissions card as the secondary CTA "Ask the school".

### 7.3 Page states

| State | Header badge | Admissions card | Indexing |
| --- | --- | --- | --- |
| L1 (address only) | Compiled from public records | "Details being verified" | noindex |
| L2, no current cycle | Compiled from public records | "Not confirmed for 2027-28 · checking" + Get alerts | **noindex** (D6) |
| L3, unclaimed | Compiled from public records | Full card, labelled "Confirmed with school by phone" / "From school notice" | indexable |
| L3, claimed + school-verified | ✓ Official record | Full card, "✓ Verified by school" | indexable |
| Suppressed (legal hold / opt-out / closed) | Page shows only a "School record unavailable" notice | — | noindex, 410 if closed |

### 7.4 Snapshot sentence (generated)

Built server-side from verified fields only. Each clause is dropped if its field is unknown, never guessed. The same text goes into `index.md`, the meta description and the OG image.

> **{Name}** is a {co-educational / girls' / boys'} {board} {day / day-boarding / boarding} school in {locality}, {city}, for {min\_class}–{max\_class}. {Admission clause}. {Fee clause}.

**Admission clause** (for the most-searched open class, else Nursery / entry class):

- open: "Nursery admissions for 2027-28 are open until 10 Dec 2026 (confirmed by the school on 2 Oct 2026)."
- upcoming: "Nursery forms for 2027-28 open on 15 Nov 2026."
- not announced: "Admission dates for 2027-28 have not been announced yet; last year forms opened on 14 Nov 2025."

**Fee clause** (only if published): "Parents report a first-year cost of ₹1.6–1.8 lakh for Nursery in 2027-28." / "The school's first-year cost for Nursery in 2027-28 is ₹1.84 lakh."

### 7.5 `/admissions` and `/fees` pages

- **`/admissions`**: session switcher (current + archives), a table of classes × {status, opens, closes, test, result, form fee, age window, seats}, then per-class detail (process steps, documents checklist with a copy/share button, official form link, notice PDF), RTE section (seats, portal dates), trust lines, Get alerts.
- **`/fees`**: class × variant selector, fee head table (amount, frequency, one-time/recurring, refundable, mandatory), computed totals, basis label, school response note, evidence links, a "Share this year's fees" CTA, and a "How we collect fees" explainer link.

## 8. School claim & portal v2

These already exist: `/for-schools/claim/[schoolId]` + pending page, `school_claims` (with a storage bucket), `school_members` (admin/staff), and `/portal` (edit-request, notices, news, team). v2 changes how claims are proven and makes the portal the school's working tool.

### 8.1 Claim methods (fastest first)

| Method | Proof | Approval |
| --- | --- | --- |
| **Domain email OTP** | OTP to an address on the school's own domain (domain of `school_links.website`, verified) | Fast-track: provisional access immediately, ops confirms within 1 business day |
| **Registry contact OTP** | OTP to the email/phone listed on the board record (SARAS/CISCE) or an ops-verified landline | Same fast-track |
| **Letterhead authorisation** | Upload a signed letter from principal/management + ops callback on the officially listed landline | Ops review before any access, within 2 working days |

- Provisional access lets the school **draft** edits. Nothing publishes until approval.
- Approval sets `claim = claimed`. The first admin gets `role = admin`. Staff invites are not built today (`/portal/team` manages teacher affiliations, not `school_members`); see `school-portal.md`.
- An ops call during research (§10) ends with "Who should approve your record?" and sends a **magic claim link** by WhatsApp/email, pre-bound to the school and that contact. This is the main acquisition path.

### 8.2 "Review your record" (first-run checklist)

Fields are grouped by family. Each row shows the current value, its source and date, and three actions: **Confirm · Edit · Doesn't apply**.

- **Confirm** writes a `field_provenance` row (`source_id = 1 school_portal`, `method = school_portal`, `review_state = accepted`) and bumps `verified_at`. The page label becomes "✓ Verified by school".
- **Edit** creates a new observation. Publishing rules:

| Change | Publishes |
| --- | --- |
| Contact, hours, about | Immediately; ops audit within 24 h (D-084) |
| Seats (OpenSeat) | Immediately, labelled "Reported by school · {date}" (D-107); ops audit (D-100, extending D-084) |
| Class range, facilities | After ops review (not in D-084's immediate list; D-100 keeps them in review) |
| Admission dates/status/form link for the current session | Immediately; alerts fire; ops audit within 24 h |
| Deadline moved **earlier**, cycle cancelled, name change, board/affiliation change | After ops review (a notice/document upload is required) |
| Fees | Via the fee flow (§5.3): verify/correct needs a circular for correct |

Show a checklist to the school, not to parents: confirm core facts · add 2027-28 admission dates · upload fee circular · respond to parent fee reports · add the widget to your website · link your Google Business Profile.

### 8.3 Portal screens (pilot)

1. **Admissions editor:** a session × class grid. "Apply the same dates to Nursery–UKG" bulk action. Upload notice PDF → existing `admission_notices` AI extraction pre-fills the fields for the school to confirm.
2. **Fees:** parent reports per class (redacted, no reporter identity), with Verify / Correct (circular upload) / Respond actions and a dispute button.
3. **Notices:** the existing `portal/notices/new`. A published notice appears in Updates, triggers alerts for subscribers of that school/class, and gets its own URL.
4. **Enquiries inbox:** the existing `enquiries` table, filterable by class/session.
5. **Widget & links:** copy-paste code, a preview, and a checklist for the website + GBP link.
6. **Team:** existing.

### 8.4 Website widget and badge (the authority step)

- **Route** `/embed/school/[code]?class=nursery&theme=light`: server-rendered, \~5 KB, no cookies, `noindex`.
  - **Shows:** the current-session status for up to 3 classes, next date, form link, and "Official record on SchoolOye →" for claimed + school-verified schools only; otherwise "Admissions info on SchoolOye →" (D-052).
- **Embed code** comes in two forms:
  1. `<iframe>` (simplest).
  2. A tiny `<script>` that writes the iframe **plus a plain `<a href="{canonical}">Admissions 2027-28 · {School} on SchoolOye</a>` into the host page's own DOM**. This makes the link crawlable from the school's domain, which is the key authority signal.
- **Static badge** (image + link) for schools that won't run scripts.
- **Tracking:** `events` rows for widget impressions and clicks (no personal data). The portal shows these as "Parents who viewed your admissions via your website".

### 8.5 Rules

- A school cannot hide or remove: parent fee reports (dispute only), the change log, stale markers or the Sources section.
- Paid features (later) never change labels, the order of facts or the verified badge (existing trust rules).

## 9. Parent features in v1

### 9.1 Admission alerts (primary CTA)

Uses the existing `alert_subscriptions` (school\_ids, class\_codes, whatsapp opt-in, language) and `alert_deliveries`. Entry point: "Get alerts" on the admissions card, pre-filled with this school + the selected class.

**Triggers** (evaluated on changes to resolved values, not on schedule):

| Event | Message |
| --- | --- |
| Cycle `not_announced` → `upcoming`/`open` | "{School}: Nursery 2027-28 forms open {date}. Last date {date}." + link |
| 3 days before `closes_on`, and deadline-day morning 08:00 IST (D-098) | Reminder |
| Any date changed | "Last date extended/changed to {date}" |
| `results_on` reached / results published | Result notice + link |
| Official notice published | Title + link |
| Fees first published or verified for a subscribed class | "2027-28 fees for Nursery now on SchoolOye" |

Each alert links to the school page with `utm` tags, respects `consents` (`whatsapp_alerts`), and has one-tap unsubscribe (existing `/my`).

### 9.2 Share this year's fees

Flow (mobile, under 2 minutes):

1. Sign in with phone OTP (existing auth). Onboarding consent + new purpose `fee_report`, with a notice explaining what is stored, that uploads are redacted, and that nothing about the child is stored.
2. Pick school (pre-filled), session, class, variant, and relationship (current parent / admitted this year / applied but didn't join).
3. Enter fee heads: a quick picker for common heads (admission, registration, tuition, annual, transport) with amount + frequency. "I only know the total first-year amount" is allowed; it counts toward the range but not toward head-level display.
4. Optional evidence upload (receipt / circular / fee page of the form). The UI tells the parent: "You can cover your child's name. We'll also hide personal details before anyone else sees it."
5. Done screen: "Thanks. We'll publish once reports are checked and tell you when the school verifies." The parent sees their own reports in `/my`.

No reward or give-to-get in the pilot. Fee comparison is out of V1 scope per the Tracker doc. Revisit after the season.

### 9.3 Report an update / Request an update

- **Report an update** (public, no login, rate-limited via `rate_limits`): kind (wrong fact / new admission info / school closed or moved / other), details, optional attachment, optional contact. Inserts into `update_reports` through a narrow `api` function (anon currently has **no** insert grant on `update_reports` after `20260925093232_revoke_excess_grants.sql`; see `admissions-tracker.md` §4) and opens an ops task (`verify_update`). Merge `correction_requests` into `update_reports` (§6.4).
- **Request an update** appears on every `NotYetPublished` / stale fact. One tap stores an anonymous counted request (`update_reports` kind `request_update`, deduped per device and day). The count raises the ops priority of that school/field ("14 parents asked for 2027-28 Nursery dates"). The count also feeds the claim pitch: "Parents are asking for your admission dates."

### 9.4 Existing features touched

- **Shortlist / compare:** show admission status and first-year cost (with basis label) on cards.
- **Age eligibility tool:** uses the same per-school `dob_from`/`dob_to` + state-rule fallback as §5.1.

## 10. Ops tooling

These exist under `/ops`: tasks, schools/\[id\] editor, claims, corrections, notices, seats, posts, audit, localities, orders, staff. The work below extends them. There is no new app.

### 10.1 Call queue: `/ops/calls` (new)

**Queue sources and priority** (highest first):

1. Cycles `open` with `closes_on` within 7 days whose `next_check_on` ≤ today.
2. Schools in the pilot set (Jaipur top 150, Gurugram top 100) with **no current-session cycle row**.
3. `next_check_on` ≤ today (any status).
4. Schools with the most `request_update` counts.
5. Tier A before B before C.

One screen per call: school header with phones (click-to-call), last call outcome, known cycles and fees, and a **structured capture form**:

| Block | Fields |
| --- | --- |
| Outcome | reached / no answer / call back at {time} / wrong number / refused / not admitting this year |
| Per class (bulk-apply to a range) | status, opens, closes, test/interaction, results, form mode + link, form fee, age window, documents, seats (if offered) |
| Evidence | "Asked school to WhatsApp the notice/fee circular" (y/n) → creates a `school_documents` placeholder the caller fills when it arrives |
| Claim | contact name + role (internal only), "Send claim link" (WhatsApp/email) |

**On save:**

- Writes `field_provenance` (`source_id = 2 ops_call`, `method = ops_call`, `observed_at = now`, `scope_key`), resolves `admission_cycles`, logs `ops_tasks` + `sales_activities`, and writes `audit_log`.
- A 10% random sample goes to a second reviewer.
- **Auto-sets `next_check_on`:**
  - 3 days if open and closing within 7 days;
  - the day after `closes_on` if open;
  - `opens_on` − 2 days if upcoming;
  - 14 days if not announced (7 days in Nov–Jan);
  - `results_on` + 1 day if closed.

**Call script (90 seconds):** introduce SchoolOye as the parent admissions guide; ask for 2027-28 dates per entry class, form mode, fee for the form, age cut-off, documents; ask them to WhatsApp the notice/fee circular; ask who should approve the school's free official record, and send the claim link. The full script lives in `docs/ops/call-script.md`.

**Capacity check:** 25–40 calls per caller per day. The pilot set of 250 schools gets its first pass in about 2 weeks with one caller, plus in-season re-checks.

### 10.2 Moderation queue: `/ops/moderation` (new; tabs)

- **Fee reports:** view evidence → **redact** (in-browser box tool over the image; saves `evidence_redacted_path`; the original is deleted 30 days after acceptance) → check the amounts against evidence → accept / reject / needs info.
  - Shows an outlier flag, a Form VI ceiling flag (Gurugram), and "same fingerprint as N other reports".
- **School edits needing review** (§8.2 high-risk list), **fee responses**, **disputes**.
- **Update reports** (existing corrections page, merged).
- **AI-extracted notices** (existing `/ops/notices`): accept fields into candidates → accepted.

**SLAs:** fee reports 48 h; school edits 24 h; in-season admission notices 12 h.

### 10.3 School research view (extend `/ops/schools/[id]`)

- **Observations tab:** every `field_provenance` row per field, grouped by scope, with source group, method, dates and evidence. Actions: accept / reject / supersede. Conflicts are highlighted.
- **"Mark verified now"** (existing) now writes an observation instead of only touching `verified_at`.
- **Links & contacts** editor for `school_links` / `school_contacts`, including GBP place id and admission portal.
- **Organisation** assignment (brand / managing body) and campus label.

### 10.4 Change monitor (data repo job)

- **What it watches:** nightly for in-season schools, weekly otherwise. It fetches `school_links` of kind `website`/`admission_portal`, plus known notice/fee/mandatory-disclosure URLs. It extends the existing `admission_notices` pipeline (`content_hash`, `extraction`).
- **On a hash change:** store a snapshot → run AI extraction → create a `verify_notice` task with the diff ("Last date text changed: 30 Nov → 15 Dec").
- **Never auto-publishes** extracted admission or fee values.
- Respects robots.txt, uses a clear user agent (`SchoolOyeBot`), and limits to one request per host per 10 s.

### 10.5 Coverage dashboard (`/ops` home)

Per city:

- schools by L-level and `index_state`
- % of the pilot set with a current-session cycle (target 100% by 15 Oct for Jaipur)
- % with published fees
- % claimed
- % with the widget link detected (from crawl)
- median fact age per family
- queue sizes vs SLA

This replaces guesswork with the numbers the strategy doc's KPIs need.

## 11. Module F — SEO / AI layer

### 11.1 Titles and descriptions (generated)

| Page | Title pattern | Description |
| --- | --- | --- |
| Overview | `{Name}, {Campus/Locality}: Admission 2027-28, Fees & Contact · SchoolOye` | Snapshot sentence (§7.4), truncated at 155 chars |
| `/admissions` | `{Name} Admission 2027-28: Dates, Age Criteria, Documents · SchoolOye` | Admission clause + age/doc summary |
| `/admissions/2026-27` | `{Name} Admission 2026-27 (archive) · SchoolOye` | Archive clause |
| `/fees` | `{Name} Fee Structure 2027-28 (Class-wise) · SchoolOye` | Fee clause with basis ("parent-reported" / "verified by school") |

The session year in titles comes from the "current session" setting (per city; switches to the next session on 1 Aug). The title never claims a year that has no data behind it: without a current cycle, the Overview title drops "Admission 2027-28".

### 11.2 JSON-LD (extends the existing mapping; generated from views only)

Keep the current `School` / `ElementarySchool` / `HighSchool` + `BreadcrumbList` output. Changes:

- `identifier`: `PropertyValue` for "SchoolOye School ID" (D-081) + board affiliation numbers. Never UDISE.
- `parentOrganization` → brand `Organization` (name, url) when present.
- `sameAs` → every verified `school_links` URL (website, GBP Maps URL, board record, official socials, Wikidata).
- `url` → the **school's own website**. The page's own URL goes in `@id` (`{canonical}#school`) and `mainEntityOfPage`.
- `event` → one `Event` per published current-session cycle window, when `opens_on` exists: `name` "Nursery admission 2027-28", `startDate`/`endDate`, `eventStatus` (`EventScheduled` / `EventPostponed` / `EventCancelled`), `location` = the school `Place`, `organizer` = the school, `url` = `/admissions`. Also for test dates.
- `WebPage` node: `dateModified` = latest `verified_at` of any displayed fact, `publisher` = SchoolOye `Organization`, `about` = `{canonical}#school`.
- **Never:** `AggregateRating`, `Review`, `employee`.
- **FAQPage:** keep the existing rule (only with ≥3 real facts). Google stopped showing FAQ rich results in May 2026, so it earns no SERP feature. It stays because the Q&A block is useful HTML for readers. Don't expand it for SEO.

### 11.3 Indexing gate (D6)

`schools.index_state` is recomputed by a data repo job on every resolved-value change. Also exposed read-only in `api.public_schools`.

- **`indexable`** requires all of:
  - L2 (address, pincode, phone or website, coordinates at pincode/locality precision or better; street/rooftop precision is required only for distance features, D-109);
  - `name_en` from a displayable source;
  - at least **one published current-session admissions record** (any status, including `not_announced`, verified by ops call or school);
  - no open brand-collision / duplicate flag;
  - not suppressed.
- **`noindex`**: everything else. The page still renders for direct visits, internal links and parents.
- **`suppressed`**: legal hold, opt-out, closed school, or ops decision. Minimal page, `noindex`, excluded from lists.

The page emits `<meta name="robots" content="noindex,follow">` from `index_state`. Sitemaps include only `indexable` URLs. This keeps the indexed set to pages with unique, current facts, and avoids scaled-content risk while the 10k-school directory fills in.

### 11.4 Sitemaps, freshness pings, crawlers

- **Sitemaps:** extend `sitemap-jaipur.xml` (and add `sitemap-gurugram.xml`) with `/admissions` and `/fees` URLs that pass their gates. `lastmod` = the latest displayed-fact `verified_at` or change time, never the build time.
- **IndexNow:** after `/api/revalidate` runs for a school, POST changed URLs to IndexNow (Bing → ChatGPT search / Copilot, Yandex). Key file in `/public`. Google relies on sitemaps.
- **robots.ts:** keep the current allow-list and add `OAI-SearchBot`, `ChatGPT-User`, `Perplexity-User` explicitly. `/embed/*` gets `noindex` in its meta, not a robots disallow, so the iframe still renders for crawlers of school sites.
- **`SITE_INDEXABLE` launch switch.** Flip it when:
  - the 15 Oct tracker acceptance criteria (§13) pass;
  - ≥ 50 Jaipur schools are `indexable`;
  - no contract/typecheck failures remain.

### 11.5 AI readability

- **`index.md` twin:** add the snapshot sentence, the admissions table (per class: status, dates, age, documents), fees with basis labels, and a sources list with dates.
- **`llms.txt`:** update the description (admissions + fees, basis labels, update cadence). Low priority.
- **Plain HTML text for every key fact** near the top (already a `CLAUDE.md` rule). Dates are always written with the year and session ("10 Dec 2026, for 2027-28").

### 11.6 Internal linking

The entity pages are the link target for:

- the city page and locality pages;
- the Admission Tracker hub ("closing this week" lists link to `/admissions`);
- compare;
- similar schools and other campuses;
- school notices;
- JaipurCircle education content (canonical links back, no duplicated content).

Anchor text uses "{School} admission 2027-28" / "{School} fees" where natural.

### 11.7 hreflang caution

The current metadata emits `en-IN` / `hi-IN` alternates. Emit `hi-IN` **only when the Hindi page has translated content** (`name_hi` + `about_hi` + translated UI). Otherwise Google sees near-duplicate pages. Gate this on a per-school `hi_ready` check in the view.

## 12. Privacy, compliance & non-functional requirements

### 12.1 Privacy (DPDP Act 2023 + Rules 2025; children's obligations from \~May 2027)

- **The account holder is always the parent.** No child data is collected for fee reports, alerts or eligibility: DOB for the eligibility checker is computed in the browser and not sent; alerts store class + school only (the existing Tracker rule).
- **Purpose-specific consent** rows in `consents` for `fee_report` (new), `whatsapp_alerts` and `application_help`. Withdrawal is honoured within 7 days. The existing `/my/account/export` and delete-account function cover access and erasure. Fee reports are anonymised on account deletion: `reporter_id` is nulled, aggregates are kept.
- **Evidence images** are private in a bucket readable by staff only. They are redacted before any non-ops viewer sees them, and originals are deleted 30 days after acceptance.
- **No behavioural tracking or ad targeting of children.** `events` stores anonymous page and widget events only. No third-party ad pixels on school pages.
- **School staff contacts** captured on calls are internal-only and never published without that person's consent.
- **Privacy notice and terms** are currently placeholders (`docs/design-gaps.md`). Legal review is needed before the fee-report launch (M2).

### 12.2 Content and legal rules

- **Published policies** (new static pages, linked from every trust label):
  - `/how-we-verify`: source groups, labels, freshness, how schools verify;
  - `/fee-reports-policy`: thresholds, redaction, moderation criteria, disputes;
  - `/for-schools/terms`: the school admin agreement, i.e. accuracy responsibility, content licence to SchoolOye, and no deletion of parent reports.
- **Moderation follows IS 19000:2022 principles** for parent submissions: verified reporter, published criteria, no suppression on a school's request alone, 180-day log of rejected items with reasons.
- **Grievance officer and IT Rules 2021 workflow:** acknowledge within 24 h, resolve within 15 days. The contact goes in the footer and on `/how-we-verify`.
- **"Official" / "Verified" wording** is used only as defined in `/how-we-verify`, with per-fact evidence stored (who, when, which document).
- **Logos and school photos** only after claim or written licence. School names are used factually.
- **Haryana Form VI** comparisons stay internal until legal review (D-013).

### 12.3 Security

- The existing rules stand: public pages read only `api.*` views (N-10); authenticated, noindex owner/staff pages (`/my`, `/portal`, `/ops`) may read raw tables under RLS per D-103; no service-role key in the app; elevated access via RLS (`is_staff`, `is_school_member`); `pnpm verify:views` in CI.
- New write paths are Server Actions with Zod validation + `rate_limits`: fee report, report/request update, portal edits, moderation. Audit-log every staff and school write (existing trigger).
- The embed route is served without cookies. The CSP `frame-ancestors *` applies to `/embed/*` only.

### 12.4 Performance and caching

- Existing budgets apply: app JS ≤ 60 KB gzip on the school page; LCP ≤ 2.0 s, INP ≤ 200 ms, CLS ≤ 0.05 on Moto G / 4G.
- **Cache tags:**
  - `school:{id}`, `school:{id}:admissions` and `school:{id}:fees`, all to be added (no `cacheTag` in `src` today, so `/api/revalidate` is currently a no-op);
  - the DB webhook → `/api/revalidate` fires on `admission_cycles`, `fee_items`, `field_provenance` (accepted), `school_links`, `school_contacts` and `schools` changes.
- Countdown, status pill and "checked N days ago" stream server-side in IST (existing pattern). The static shell never bakes a date-relative string.
- Embed: edge-cached for 5 min, stale-while-revalidate.

### 12.5 Quality gates

- **Unit tests:**
  - precedence resolver (fixtures per family);
  - label mapping;
  - fee totals (one-time/recurring/partial);
  - fee publish thresholds (1-with-evidence / 3-agreeing / outliers);
  - status derivation (`closing_soon` in IST around midnight);
  - snapshot sentence (each clause drops out cleanly);
  - `index_state` rules.
- **E2E (Playwright):**
  - unclaimed L2 page is `noindex`;
  - L3 page is indexable with Event JSON-LD;
  - parent fee report → moderation → published range;
  - school claim via domain OTP → verify fee → label changes;
  - report update → ops task;
  - widget renders and links canonically.
- **Schema validation:** JSON-LD is validated in CI against schema.org types (no errors in the Rich Results test for Event/Breadcrumb).
- The audit's open items that affect this work must be fixed first: the silent `return []` in `public-adapter.ts` must throw/log, and CI typecheck must be green.

## 13. Milestones & acceptance criteria

The dates fit the Admissions Tracker plan (tracker live 15 Oct, concierge 1 Nov). Each milestone lists the work and then what "done" means.

### M0: Data foundations (by 3 Oct)

- Data repo applies the additive DDL in §6.1 and seeds `source_group`, `field_families` and `source_precedence`.
- Gurugram: assign `city_id` and `locality_id` to the pilot set (top 100 by demand); fix the four duplicated Haryana district rows.
- Pilot lists fixed: Jaipur 150, Gurugram 100 (by keyword demand × likely to claim).
- UDISE display (D-082) and training crawlers (keep allowed, D-048) are decided.

**Done when:**

- `pnpm db:types` is regenerated;
- `pnpm verify:views` passes;
- every pilot school has a `city_id`;
- the precedence tables are non-empty.

### M1: Admissions-first page + call loop (by 15 Oct, tracker launch)

- Views: `api.public_schools` uses per-family precedence + `fact_meta`; `api.public_school_admissions` has derived `closing_soon` and the timeline; `api.public_school_sources`; `api.public_school_updates`.
- Page: header badges, snapshot sentence, admissions card with class picker, eligibility, quick facts with labels, Sources & verification, Updates, `/admissions` + archive route, `index.md` extension.
- SEO: `index_state` gate + robots meta, titles, Event JSON-LD, sitemap `lastmod`, IndexNow.
- Parents: alert triggers (§9.1), Report an update, Request an update.
- Ops: `/ops/calls` queue + capture form + `next_check_on` rules; the observations tab (read-only is fine for M1).

**Done when:**

- ≥ 100 Jaipur pilot schools have a verified current-session cycle row (any status), and ≥ 50 are `indexable`;
- the snapshot sentence renders correctly for the open / upcoming / not-announced cases;
- an L2 page without a current cycle serves `noindex`;
- changing a `closes_on` in ops updates the page within 60 s and sends an alert to subscribers;
- Lighthouse budgets pass;
- then flip `SITE_INDEXABLE`.

### M2: Claim v2, widget, fee intake (by 1 Nov, concierge launch)

- Claim: domain-email OTP and registry-contact OTP methods; magic claim links from the call screen; the "Review your record" checklist; the portal admissions editor with notice-upload pre-fill.
- Widget: `/embed/school/[code]`, script + iframe + badge, and the portal page for them.
- Fees: the `fee_reports` intake flow, the redaction + moderation queue, `api.public_school_fees` with thresholds, the `/fees` route, fee summary on the Overview.
- Policies: `/how-we-verify`, `/fee-reports-policy`, `/for-schools/terms`; legal review of privacy/terms + fee reports.
- Gurugram pilot pages live (same gate).

**Done when:**

- a school claims via domain OTP and confirms a field in under 10 minutes end-to-end;
- a widget installed on a test site shows a crawlable `<a>` to the canonical URL;
- a fee report goes submitted → redacted → accepted, and the range appears only after the threshold is met;
- no child data is stored anywhere in the flow (verified by schema review).

### M3: Verification depth (by 15 Dec)

- School fee actions: verify / correct (circular) / respond / dispute.
- Change monitor job (data repo) + `verify_notice` diffs.
- Organisation/brand/campus + other-campuses rail + `parentOrganization`.
- `school_contacts` / `school_links` backfill; `sameAs` from links; the GBP link step in the portal.
- Coverage dashboard; observations tab actions (accept/reject/supersede); conflict flags.

**Done when:**

- a changed admission notice on a school website creates a diff task within 24 h;
- the verified-fee label replaces the parent-reported label on school verification;
- conflict handling shows a single value + "Re-checking";
- the dashboard KPIs match hand counts.

### M4: Season hardening (Jan–Feb 2027)

- Destructive clean-ups (§6.4, with approval).
- Hindi pages where `hi_ready`, with hreflang only then.
- Performance and accessibility pass.
- Post-season review against the strategy KPIs: % claimed, % widget-linked, fact freshness, search impressions on "{school} admission/fees" queries, AI citations test set.

## 14. Deferred scope, changes to earlier docs, open questions

### 14.1 Deferred (the data model leaves room; not built in the pilot)

| Item | Revisit |
| --- | --- |
| Parent reviews / ratings, "what parents like" | After the 2027-28 season, under IS 19000 + DPDP children's rules |
| Facilities, Teachers, Photos tabs; results, achievements, student life (Module B) | When claimed schools supply the data; facilities taxonomy exists (`facilities`, 13 rows) |
| Commute times, landmarks/metro on the page | After pilot; distance only for now |
| Brand pages, chain-level fee comparisons | M4+ |
| Fee comparison tables, give-to-get unlock for fee reports | Out of V1 per the Tracker doc |
| Paid school tiers (analytics, enhanced media) | After trust KPIs are met; never on the entity page's facts |
| Sponsored placements on city/list pages | Allowed from 1 Dec, with border + "Sponsored" label (D-089); never on a school page's facts or above a ≤7-day deadline |
| Hindi content at scale | M4, gated by `hi_ready` |
| Open dataset (`Dataset` JSON-LD) of verified fees/dates | After one full season of data |

### 14.2 Where this spec changes earlier docs

| Topic | Earlier | Now |
| --- | --- | --- |
| Entity URL | Strategy doc: `/school/{slug}` | Keep the shipped `/[locale]/[city]/[slug]-[code]` (D1) |
| Sub-pages | Strategy doc: per-session URLs | Evergreen `/admissions`, `/fees` + archives (D2) |
| Fees source | Tracker: form fee only; strategy: school-confirmed | Parent-reported with school verification (D3) |
| Freshness | `CLAUDE.md`: 7 days for every fact; Tracker: 14 days | Per-family SLAs (§3.5, D-087). `CLAUDE.md` updated 27 Sep |
| `closing_soon` | Stored status | Derived in view (§5.1) |
| Indexable | `DATA_ACCESS.md`: L2 | L3 only (D-090). `docs/spec/data-and-trust.md` updated 27 Sep |
| Source trust | One global `trust_rank`, hard-coded id lists in `010_public_schools.sql` | Source groups + per-family precedence tables (§3) |
| FAQPage | Earlier docs: for AI citation | Kept only as reader content; no SERP expectation (§11.2) |
| `Course` / `hasOfferCatalog` (Strategy Blueprint) | Required | Not adopted: no rich result, and class range is already in `School` + text |
| Claim timing | Strategy: Oct; Tracker: Nov | Claim v2 in M2 (1 Nov); the existing claim flow keeps working meanwhile |
| Brand spelling | "Schooloy" in JSON-LD `propertyID` and some docs | "SchoolOye" everywhere (D-081) |

### 14.3 Former open questions (all decided 27 Sep)

| # | Question | Decision |
| --- | --- | --- |
| Q1 | UDISE display | D-082: directory facts with UDISE+ attribution at the lowest official rank; contacts under licence-note conditions; code internal |
| Q2 | Training crawlers | Keep allowed (D-048) |
| Q3 | Third-party rankings on school pages | No; editorial guides only, attributed (D-088) |
| Q4 | Form VI shown publicly | No; internal ceiling check until legal review (D-013) |
| Q5 | Fee publish thresholds | 1 report with evidence, or 3 agreeing within 10%; review after the first 100 reports (D-013, §5.3) |
| Q6 | School admission-date edits publish immediately | Yes, with 24 h ops audit (D-084); seats too (D-100) |
| Q7 | Pilot school lists | Ops finalises in M0 by keyword demand × likelihood to claim (D-007) |

### 14.4 Handoff

This file is the canonical spec. The §6.1 DDL goes to the data session as a request (D-091). `docs/screen-map.md` gets rows for `/admissions`, `/fees`, `/embed`, `/ops/calls` and `/ops/moderation`.
