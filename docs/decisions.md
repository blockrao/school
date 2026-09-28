# SchoolOye — Decisions Register

**Single source of truth for decisions.** If any other doc, code comment or chat thread disagrees
with an entry here, this register wins until a new entry supersedes it.

- **Authority order:** Decisions Register → Developer Spec (`docs/spec/`) → Guidelines
  (`docs/guidelines/`) → Master Document (Docs) → research / archive.
- **Format:** `ID · decision · date · source · supersedes`. Entries are never deleted; a changed
  decision gets a new entry that names the one it replaces, and the old one is marked superseded.
- **Reading/commenting copy:** "SchoolOye — Decisions Register" in Claude Docs. This file is canonical.
- **Last consolidated:** 27 Sep 2026, from 12 planning docs, 17 repo docs, SQL view headers,
  Product Specification v1.0 (23 Sep) and the project notes. Master Strategy v3.1 folded in 28 Sep
  (D-112, D-113; its remaining ideas are mapped in the Master Document §4 and §12).

---

## N. Architecture non-negotiables (frozen Sept 2026)

Code comments call this "the checklist". Layer model: Identity → Data → Trust → Intelligence →
Experience → Distribution.

| ID | Non-negotiable | Built? |
|---|---|---|
| N-01 | Immutable entity IDs, decoupled from URLs and names (`schools.id` UUID; public `school_code`, 6 digits, never reused) | Yes |
| N-02 | Exam → Cycle → Entry model: evergreen exam/school entity, versioned cycles, old cycles never deleted (`admission_cycles` extended with `exam_id`) | Yes |
| N-03 | Two provenance dimensions on every fact that can be wrong: `source_type` (who) and `verification_status` (unknown / pending / verified / conflicting). **Unknown is a real state, never false** | Partly — columns added 26 Sep; legacy `verification` still read in places |
| N-04 | Closed-vocabulary taxonomy tables with aliases (boards, class levels, facility types, teacher roles) | Mostly |
| N-05 | `claim_status` on schools. Ownership ≠ verification ≠ authorship; a claimed-but-unverified school's facts stay `school_reported` | Yes |
| N-06 | Audit-logged mutations on launch-critical fields (fees, seats, admission dates) | Yes (`audit_log` triggers) |
| N-07 | SSR, crawlable pages with generated (never hand-authored) JSON-LD | Yes |
| N-08 | Faceted-filter URLs are non-canonical and non-indexable | Yes |
| N-09 | Minors' data: per-purpose consent + RLS isolating child tables; never joined into public views | Yes |
| N-10 | Public pages read only `api.*` views (and `api` functions, D-102), each with a Zod contract (`pnpm verify:views`); authenticated owner/staff pages per D-103. *Known gap:* `public-adapter.ts` still has two unused raw sub-queries (`school_identifiers`, `field_provenance`) to remove | Mostly |
| N-11 | No Supabase CLI, no MCP connection to Supabase, no service-role key in the app; all DB commands run through Claude Code from the terminal | Yes |
| N-12 | No source name inside stored data values (address, phone, email…); provenance lives in provenance tables | Rule |
| N-13 | Trust law: no paid ranking, no sold votes, no "best" badges for sale, sponsored always labelled, no fabricated data (incl. fixtures), SchoolOye does not sell admissions | Yes |
| N-14 | Nothing extracted or scraped is published until a person approves it. Scoped exception: D-084 | Yes |

---

## Product, scope, launch

| ID | Decision | Date · source | Supersedes |
|---|---|---|---|
| D-001 | Positioning: an admissions infrastructure platform presented as a school directory. Beachhead: the Rajasthan/NCR school-admission decision | Sep · Strategy Blueprint | — |
| D-002 | Scale by vertical, not city. One database (city is a field), one domain with city paths, no per-city brands. JaipurCircle shows a SchoolOye summary/widget with a canonical link to SchoolOye | 25 Sep · Launch Plan, notes | — |
| D-003 | Digital platform run from a central office; no field sales or ground staff initially; pages built from public data, schools come to claim | Sep · notes, Product Spec v1.0 | — |
| D-004 | Keep: school graph + claim; OpenSeat; admission concierge + document vault; light claimable teacher profiles | Sep · notes | — |
| D-005 | Gated phases: season tracker → manual concierge → school-side paid tools → expansion. Gates: end of week 4 (subscribing/sharing?), week 12 (will parents and schools pay?), end of season (a business?). *Gate numbers still to be set* | 23–25 Sep · Product Spec v1.0, Launch Plan | — |
| D-006 | Season dates: tracker live **15 Oct 2026**; concierge **1 Nov 2026**; Rajasthan RTE guide late Jan; Haryana RTE guide March; decision memo 30 Apr 2027 | 26 Sep · Tracker & Concierge | Product Spec week numbering |
| D-007 | Coverage: top 150 Jaipur + 100 Gurugram schools researched; Tier A first (A = most-searched private CBSE/ICSE, B = other private, C = government) | 26 Sep · Tracker, Product Spec A6 | "50–200" |
| D-008 | Season north star: WhatsApp alert subscribers per city, then paid application-help orders | 23 Sep · Product Spec v1.0 | — |
| D-009 | Out of V1: common application form, reviews/ratings (post-season, P2), fee comparison tables, mobile app, rankings on school pages, broad paid ads | 25–26 Sep · Tracker, Launch Plan | — |
| D-010 | Concierge: parent-paid only; never implies a seat; no referral fees from schools; never ask for portal passwords; documents deleted after the season | 26 Sep · Tracker | — |
| D-011 | Monetisation order: concierge → school products (featured placements, enquiry packages, subscription) → parent membership (test later) | Sep · Strategy Blueprint | — |
| D-012 | Exams: school-entry exams only (RMS CET live; Sainik, JNV, NDA later), not JEE/NEET. One evergreen page per exam at `/[locale]/exams/{slug}` (no city segment). *Amended by D-101* | 25–26 Sep · Admissions Platform | "`/[city]/…` for everything" (exams only) |
| D-013 | **Fees come from parents**: evidence-backed parent reports, published as labelled ranges above a threshold; the school verifies, corrects (with a circular) or responds. Official fee documents shown alongside; Haryana Form VI is an internal ceiling check only | 26 Sep · Prav | Product Spec A12 "verified only"; Tracker "form fee only" |
| D-014 | Admissions data order: web + official sources → ops phone calls → school portal after claim | 26 Sep · Prav | — |
| D-015 | MVP: the whole platform end-to-end in one city (Jaipur) first, then add cities | late Sep · notes | "Delhi first" |

## Data, trust, provenance

| ID | Decision | Date · source | Supersedes |
|---|---|---|---|
| D-020 | Pipeline: `sources` → `source_records` → `schools` → `school_identifiers`/`school_affiliations` → `field_provenance` → `data_quality_flags`; enrichment never overwrites a filled value | 25 Sep · Directory Spec | — |
| D-021 | Per-field provenance is live (`field_provenance`, one row per value per source) | 25–26 Sep · built | "3 columns now, fact table later" |
| D-022 | A fact is shown only if its provenance traces to a displayable source; otherwise "Not yet published" | 25 Sep · `010_public_schools.sql` | — |
| D-023 | Source groups + per-fact-type precedence (affiliation, directory, contact, admissions, fees, school voice) replace one global `trust_rank` | 26 Sep · `spec/data-and-trust.md` | Hard-coded source-id lists |
| D-024 | Parent-facing labels: Verified by school · Confirmed with school by phone · Official record · From the school's website/notice · Reported by parents (fees only) · Calculated · Not yet published. *Amended by D-107* | 26 Sep · entity spec | 5-label list incl. "Sponsored" |
| D-025 | Admission cycles are shown only after a person approves them (ops or school); AI extraction alone never publishes | 25 Sep · DATA_ACCESS | — |
| D-026 | Stale facts are flagged ("re-checking"), never hidden | Sep · Product Spec A11 | — |
| D-027 | Competitor aggregators are never a source; researchers may use them privately as leads | 26 Sep · entity spec | — |
| D-028 | AI web-research output (source 16) is a lead list until ops verifies each field | 25 Sep · Directory Spec | — |
| D-029 | Third-party rankings live in `school_rankings`, separate from provenance (display: D-088) | 25 Sep · Directory Spec | — |
| D-030 | Identity keys: UUID internal; `school_code` public; UDISE for matching; board affiliation nos. public. Match order UDISE → affiliation no. → name + pincode + distance (review only) | 25–26 Sep | — |
| D-031 | Organisation → brand → campus: each `schools` row is one campus with one admission office | 26 Sep · entity spec | — |
| D-032 | Logos, photos, media: school-supplied or licensed only | Sep · Product Spec A13 | — |
| D-033 | Nearby localities from `locality_neighbors`; `localities.nearby_locality_slugs` is dead | 25 Sep · Directory Spec | — |
| D-034 | JaipurCircle locality data synced once with approval; any future read needs approval each time | 24 Sep · `sources` note | — |

## URLs, SEO/GEO, pages

| ID | Decision | Date · source | Supersedes |
|---|---|---|---|
| D-040 | Canonical school URL `/[locale]/[city]/[slug]-[school_code]`; resolved by `school_code`; changed slug 308s; no state/district/locality in the path; old `/[locale]/school/[id]-[slug]` permanently redirects | 26 Sep · built | Product Spec `/school/[city]/[slug]`; old CLAUDE.md `/school/[id]-[slug]` |
| D-041 | UI geography: city/town → locality → school. District is internal only. Locality is a filter on city pages; locality pages only where content justifies | late Sep · notes | Breadcrumbs "state → district → city → locality" |
| D-042 | One evergreen `/admissions` and `/fees` per school (current session); past sessions at `/admissions/{yyyy-yy}` | 26 Sep · entity spec | Per-session URLs |
| D-043 | Root domain is a city picker; no geo-IP redirect | 25 Sep · Directory Spec | — |
| D-044 | Sitemaps: one route handler per launched city + `sitemap-site.xml`; real `lastModified`; indexable URLs only | 25–27 Sep · built | `sitemap.ts` |
| D-045 | JSON-LD generated from views: `School` subtype, address, geo, identifier (SchoolOye School ID + board affiliation no.; never UDISE code), `sameAs`, `BreadcrumbList`, `Event` for admission windows. Never `AggregateRating`/`Review`/`employee` | 25–26 Sep | — |
| D-046 | FAQ block only with ≥3 real facts; reader content only (Google stopped FAQ rich results May 2026) | 26 Sep | "Q&A for AI citation" |
| D-047 | No invented GEO content: no fake FAQs, invented schema or "GEO paragraphs" | Sep · Architecture Foundation | — |
| D-048 | Markdown twin `…/index.md` per school + `llms.txt`; search and AI crawlers allowed | 25–26 Sep · built | — |
| D-049 | Unknown facts show "Not yet published", never guessed; every fact carries source + checked date | Sep · Product Spec | — |
| D-050 | Visual rules: margin red only for deadlines 0–7 days; colour always with a text label; min text 14 px; deadline margin is the signature element | 23 Sep · Product Spec §7 | — |
| D-051 | Performance: ≤60 KB gzip app-owned JS on the school page; LCP ≤2.0 s, INP ≤200 ms, CLS ≤0.05 (Moto G / 4G) | 25 Sep | "JS under 120 KB" |
| D-052 | Unclaimed pages: "Compiled by SchoolOye from public records", no logo, no "Official". "Official record" only on claimed, school-verified pages | 26 Sep · entity spec | — |
| D-053 | Only named landing pages (city, city + board, city admissions-open) are indexable. *Scoped by D-108* | Sep | — |

## Schools, parents, ops, privacy, infrastructure

| ID | Decision | Date · source | Supersedes |
|---|---|---|---|
| D-060 | Claiming is free and never affects search position; staff review; proof = official email domain **or** board-record contact **or** letterhead + callback | 23–26 Sep | "domain OTP **and** letterhead" |
| D-061 | Roles: `profiles.role` (parent, school_admin, ops, admin); `school_members` (admin, staff); no self-promotion; RLS enforces access | 25–26 Sep · access-control | — |
| D-062 | Schools cannot hide or delete parent fee reports (dispute only), the change log, stale markers or Sources | 26 Sep · entity spec | — |
| D-063 | Website widget + badge with a crawlable canonical link; installing it is part of completing a claim | 26 Sep · entity spec | — |
| D-064 | Alerts: phone sign-up (city, class, optional schools), explicit WhatsApp opt-in; triggers on opens, deadlines, date changes, results, notices; weekly digest; one-tap unsubscribe | 23–26 Sep | — |
| D-065 | Ops call loop driven by `next_check_on`; re-check every 3 days within 7 days of a deadline; each call ends with a claim invite | 26 Sep | — |
| D-066 | Report an update: public, no login → verification queue. Request an update: counted demand → ops priority | 23–26 Sep | — |
| D-067 | Child data minimum: parent is the account holder; child = first name, DOB, target class, city with consent; alerts store class + area; eligibility DOB computed in the browser; fee reports hold no child data | 23–26 Sep | — |
| D-068 | Documents: encrypted, purpose-limited, masked Aadhaar only, deleted after the season (`retain_until` ≤ upload + 12 months). Legal review pending. *Amended by D-104* | 25 Sep | — |
| D-069 | Consent per purpose in `consents` (account, child_profile, whatsapp_alerts, application_help, document_storage, marketing, fee_report); versioned; withdrawable | 25–26 Sep | — |
| D-070 | Stack (don't substitute): Next.js 16, React 19, TS strict, Tailwind v4 + shadcn/ui, Supabase Postgres + PostGIS + Auth, Vercel, MapLibre, Zod + Server Actions, Biome, Vitest, Playwright; modular monolith | Sep | — |
| D-071 | One Supabase project `ybevzpryuvgxclkhdjld`; old `xpccgcctmnfwbcbhwsqv` discarded (move `DATABASE_URL_PAYMENTS` off it) | 25–26 Sep | — |
| D-072 | Repo split: data repo extracts/saves data and will retire; `school` repo owns UI, views, grants, RLS, publishing rules, `/ops` + `/portal` writes | late Sep | — |
| D-073 | DB authority: Claude Code self-applies non-destructive changes; destructive ones need Prav's explicit yes after seeing the SQL. *Clarified by D-111* | 25–26 Sep | "a human runs `--confirm`"; "no write access" |
| D-074 | `design/*.dc.html` is reference only; missing designs get a minimal component-built version logged in `docs/design-gaps.md` | 25 Sep | — |
| D-075 | Roles: Prav founder/product architect; Claude Code primary builder; Codex reviewer; Lovable UI experiments only | Sep | — |
| D-076 | Frontend doesn't wait on data and doesn't judge data quality outside the publishing-rule views | late Sep | — |

## Decided 27 Sep 2026 — product-manager calls (Prav can override any row)

| ID | Decision | Resolves |
|---|---|---|
| D-080 | Launch order: Jaipur live now → Gurugram pilot by 1 Nov (after `city_id`/locality assignment for its schools) → Delhi nursery hub as content before the DoE notification → rest of Haryana after the season | Launch-region contradictions |
| D-081 | Brand **SchoolOye** everywhere (UI, docs, JSON-LD `propertyID`); trademark filed as SCHOOLOYE | "Schooloy" spellings |
| D-082 | UDISE+ directory facts shown with "Official record · UDISE+" attribution at the lowest official rank; contacts only under the licence-note conditions; UDISE code stays internal | Notes vs `010_public_schools.sql` |
| D-083 | Region: DB Mumbai `ap-south-1`, Vercel `bom1`; docs saying Singapore are stale (verify once in the Supabase dashboard) | Notes vs CLAUDE.md |
| D-084 | A verified school admin's edits to current-session admission dates/status/form link, contacts, hours and "about" publish immediately with an ops audit within 24 h; earlier deadlines, cancellations, name/board/affiliation/fee changes go through review | Product Spec H2, portal prototype, entity spec |
| D-085 | Existing claim flow stays live; claim v2 ships 1 Nov | Claim timing |
| D-086 | Hindi: UI strings translatable now; Hindi city + admissions-tracker pages by 15 Nov; school pages get `/hi` + hreflang only when `hi_ready` | "Bilingual day one" vs "English first" |
| D-087 | Freshness limits by fact type: admissions open/closing 3 days, upcoming/not announced 14; fees per session or 180 days; contacts 90; identity 365; Tier A first | 7 / 14 / "1–2 weeks" |
| D-088 | Third-party rankings only on editorial guides, attributed; never on school pages, cards or search order | Rankings |
| D-089 | Sponsored placements on city/list pages from 1 Dec with border + "Sponsored" label; never on a school page's facts or above a ≤7-day deadline | Sponsored timing |
| D-090 | *(Index part superseded by D-114)* Render at L1+; index only at L3 (verified current-session admissions record, any status); `schools.status` only suppresses (hidden / closed / opt-out) | Publish/index gate |
| D-091 | Data session owns table DDL until the data repo retires; then the `school` repo owns all migrations | Table ownership |
| D-092 | Government schools listed and searchable as Tier C, `noindex` until they have admissions data | Product Spec open decision |
| D-093 | Repo goes private once Vercel is on a paid plan | Platform Audit |
| D-094 | *(Superseded by D-114)* `SITE_INDEXABLE` flips when ≥50 Jaipur schools are L3 and CI is green (target 15 Oct) | Audit, entity spec |
| D-095 | Test prices for application help: ₹299/499, ₹1,499/2,499, ₹4,999+. **Still open (Prav): WhatsApp provider, season staffing** | Product Spec open decisions |
| D-096 | City admissions page lives at `/[locale]/[city]/admissions` (sections: closing soon, opened this week, opening soon, open with no last date); filtered variants are noindex | Product Spec `/admissions-open` vs screen map |
| D-097 | Locality pages are indexable only with ≥8 schools at L2+ and ≥2 at L3; otherwise rendered and linked but noindex | D-041 "where content justifies" vs all-indexable today |
| D-098 | Alert timing: form opens → immediate; reminders 3 days before and deadline-day morning (08:00 IST); date changes immediate; weekly city digest Friday 18:00 IST | Product Spec D2 vs entity spec 7d/1d |
| D-099 | RTE/EWS: pilot shows state RTE dates as sourced guide content (not modelled as exams); RTE updates go out in the city digest | Tracker RTE modelling question |
| D-100 | Seat updates from a verified school admin publish immediately, labelled "Reported by school · date", with an ops audit (extends D-084). Class range and facilities stay in review | Seats vs D-084 list |
| D-101 | Amends D-012: exams covered are school-entry and school-stage exams — RMS CET live; Sainik, JNV next; NDA later as notification tracking only. Never JEE/NEET. Intent sections (dates, eligibility, syllabus) stay on the one exam page | NDA is post-Class-12; intent-page URLs |
| D-102 | Amends N-10: the `api` schema may also hold read-only SQL functions (security invoker, Zod contract, covered by `verify:views`) where a view can't serve, e.g. typo-tolerant search | Search needs a function |
| D-103 | Amends N-10: authenticated, noindex owner/staff pages (`/my`, `/portal`, `/ops`) may read raw tables through the session client under RLS; every public page reads `api.*` only. Each such module lists its tables at the top | Concierge/portal/ops code reading raw tables |
| D-104 | Amends D-068 to match D-010: concierge documents are deleted at season end (30 Apr) or 12 months after upload, whichever comes first; purge runs weekly on a schedule | Retention conflict |
| D-105 | Teacher direct messaging stays live; report/block must ship before any promotion of it; no new teacher features before 1 Nov | Backlog "Request contact" parked vs shipped DM |
| D-106 | Every decision above is binding on specs: a spec that lists something as "open" that this register settles must cite the entry instead | Consolidation rule |
| D-107 | Amends D-024: adds labels "Reported by school · {date}" (seat updates, D-100) and "From the official notice · {issuer}, dated {date}" (exam bulletins) | Label list gaps |
| D-108 | Scopes D-053: it governs listing, filter and landing pages only. Entity pages follow their own gates (schools at L3 per D-090, exam pages, published teacher profiles); service pages with real content (`/admissions/help`, `/tools/age-eligibility`, guides incl. RTE guides) are indexable | D-053 read literally blocked entity pages |
| D-109 | The L3 index gate needs coordinates at pincode/locality precision or better; street/rooftop precision is required only for distance features | Street precision made D-094 unreachable |
| D-110 | Alert quiet hours are 21:00–08:00 IST; the deadline-day reminder goes at 08:00 IST (D-098) | Tracker quiet window blocked D-098 |
| D-111 | Clarifies D-073 vs D-091: table DDL is run by the data session (Claude Code in the data repo); sessions in this repo run views, `api` functions, grants, RLS and seeds only. The new `field_provenance` review column is named `review_state` to avoid clashing with the existing `review_status` enum | Authority ambiguity; enum name clash |
| D-112 | No paid "Verified" tier (drops v3.1's "SchoolOye Verified ₹999/yr"). Paid school products may never be named or labelled Verified, Official or Partner, and never include "reputation management" that touches parent reports, the change log, stale markers or Sources | v3.1 §17 vs D-024, D-052, D-060, D-062, N-13 |
| D-113 | Concierge is digital-only this season: no physical submission partners (CSC operators, couriers) and no offline support; revisit in the 30 Apr decision memo | v3.1 §21, Consumer Spine vs D-003 |
| D-114 | **MVP index rule** (supersedes the index part of D-090, and D-094, D-097's L3 count, D-109): a school page is indexable once it has a name, address with locality/pincode, board, and a phone or website, each from a displayable source (L2). A current-session admissions record enriches the page but is not required. Pages below L2 render `noindex`. `SITE_INDEXABLE` flips as soon as the Jaipur pilot list is loaded at L2 and CI is green. Indexing stays limited to launched cities (Jaipur, then Gurugram); government schools follow the same rule (supersedes D-092's noindex) | Prav 28 Sep: MVP must get schools live and discoverable now |
| D-115 | **MVP publishing rule** (amends N-14, D-025 for the MVP): directory, affiliation and contact facts from official registries (board lists, UDISE+ directory, state lists) or the school's own website publish directly with their source and checked date; ops spot-checks a sample weekly. Admission dates publish when they link to the school's own notice or website page, after a quick human glance (batch review). Values with no evidence link (AI research alone, hearsay) never publish. Precedence tables, review states and the fuller provenance plumbing (R-01, R-02) wait until after launch | Same |
| D-116 | **Launched cities are data-driven** (supersedes D-080's launch order for listing, sitemaps and navigation): a city/district is launched once at least one school there renders name + address + pincode from displayable sources (`api.public_areas.is_launch`). 32 districts qualify as of 28 Sep after the D-115 view change (Jaipur, all 22 Haryana districts, nine Delhi districts). Each launched city has a sitemap route; season operations (tracker, calls, concierge) still start with Jaipur and Gurugram | Prav, other session 28 Sep (commits 0873587, 2681de5) |
| D-117 | **Supabase access** (amends N-11): the Supabase MCP connector and CLI are allowed alongside terminal `DATABASE_URL` access. Destructive changes still need Prav's explicit yes with the SQL shown first. The app still never uses the service-role key | Prav, other session 28 Sep (commit db10f7f) |
| D-118 | **Repo `CLAUDE.md` removed** at Prav's request to cut friction during data loading. This register, `docs/spec/` and `docs/guidelines/` remain the reference; sessions should read `docs/decisions.md` first | Prav, other session 28 Sep (commit 4c76b65) |
| D-119 | **Publish = `schools.status = 'published'`; show data as stored** (supersedes D-022's per-field source gate, D-025's verified-only admissions, D-082's UDISE+ limits, D-114, D-115 and the listing/sitemap completeness filters). `api.public_schools` returns every published school with every column as stored; boards and admission cycles are shown without source or verification filters (the `verification` value is still exposed for labels); a district is launched when it has a published school; every published school is listed and goes in its city sitemap. Source/date lines stay as display only | Prav 28 Sep: "we have the data in the tables, show them, don't keep any intelligence in between" |

---

## Deferred (with triggers) and parked

The source docs name a trigger only for the fact ledger; the other triggers are proposals awaiting
Prav's confirmation.

| Item | Trigger |
|---|---|
| Full fact-versioning / conflict ledger, confidence scoring | A second live automated source that can disagree with manual verification (minimal review states + conflict flags are in `spec/data-and-trust.md`) |
| Automated change detection | Pulled forward: school-website change monitor (entity spec M3) |
| Automated entity resolution | >2 sources per city beyond UDISE + board, or duplicate flags >2% |
| Data-quality console | Open `data_quality_flags` exceed what `/ops` clears weekly |
| General notification platform | A second alert type beyond admissions and exams |
| Full student passport | Concierge repeat usage across two seasons |
| Teacher as first-class entity / tutor marketplace | Evidence from free teacher profiles |
| Formal public API | A second consumer (JaipurCircle or a partner) needs data programmatically |
| Parent reviews | Post-season (P2), under IS 19000 + DPDP children's rules |
| School insights (analytics) | Enough real traffic that numbers aren't made up |
| Child Pass, participation challenge, tutor/activity discovery | Test later, on evidence only |

**Parked — do not resurface unless Prav reopens:** ERP · AI Principal · school communication
suites / SchoolOye Circle · educator social network · magazine · expos/fests/awards nights ·
entrepreneurial chapters · vendor/procurement marketplace · school store/commerce · transport ·
safety dashboard · college extension · virtual faculty · counselling · AI companion/tutor inside a
paid pass · gimmick hooks · multi-year revenue projections · JEE/NEET · YouTube channel (for now).

---

## Document map

| Doc | Home | Purpose |
|---|---|---|
| SchoolOye Master Document | Claude Docs | Strategy + product: vision, positioning, GTM, phases and gates, feature catalogue, KPIs |
| Decisions Register | this file (+ Claude Docs reading copy) | What's decided; wins every conflict |
| Developer Spec | `docs/spec/` (start at `README.md`) | Architecture, data contract, one spec per feature, data requests |
| Guidelines | `docs/guidelines/` | SEO/GEO, content and trust, design |
| Status and ops | `docs/screen-map.md`, `docs/design-gaps.md`, `docs/ops/` | Build tracker; runbooks |
| ~~CLAUDE.md~~ | removed 28 Sep (D-118) | Rules now live only in this register, `docs/spec/` and `docs/guidelines/` |

**Superseded (archived, read-only):** Refined Strategy & Execution Blueprint, Launch Plan 2027–28,
Product Specification v1.0, Master Strategy v3.1 → Master Document · Data & Technical
Architecture Foundation → this register (N, deferred) + `docs/spec/README.md` · School Directory
Product & Data Spec → this register + `school-entity-page.md` + `data-and-trust.md` · Admissions
Platform → `exams.md` + `admissions-tracker.md` · Admissions Tracker & Concierge →
`admissions-tracker.md` + `concierge.md` (season plan → Master) · School Entity Development Spec
(Docs) → `school-entity-page.md` · Entity Strategy & Research, Competitor Teardown → research
library · Platform Audit → `docs/spec/README.md` known issues · RMS CET prototype → live exam
page · School portal prototype → design reference · repo `DATA_ACCESS.md`,
`access-control-design.md`, `deploy.md`, `data-retention.md` → `docs/spec/`, `docs/ops/` · repo
data-coverage, city-mapping, handoffs → `docs/archive/2026-09/`.

