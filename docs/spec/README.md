# SchoolOye Developer Spec

**The developer spec for the whole platform, split by feature.** Product intent and strategy live in
the Master Document (Claude Docs); decisions live in `docs/decisions.md`, which wins every conflict.
Every Claude Code session building SchoolOye starts here.

**Updated:** 27 Sep 2026 · **Owner:** Claude Code (maintains), Prav (approves)

## How the docs fit together

| Question | Look in |
|---|---|
| Why are we building this, for whom, in what order? | Master Document (Claude Docs) |
| Has this been decided? What wins in a conflict? | `docs/decisions.md` |
| How does the system work; what must every screen obey? | this folder: `data-and-trust.md`, `access-control.md` |
| What exactly do I build for feature X, and how do I know it's done? | this folder: one file per feature |
| URLs, metadata, JSON-LD, indexing, copy, labels, visual rules | `docs/guidelines/` |
| What's built right now? | `docs/screen-map.md`, `docs/design-gaps.md` |
| Table changes waiting on the data session | `data-requests.md` |
| Deploy, call script, retention runbooks | `docs/ops/` |
| Old planning docs and snapshots | `docs/archive/` (read-only, never cited as rules) |

**Rules for editing specs**
- A spec never re-decides something `docs/decisions.md` settles; it cites the entry (D-106).
  New decisions are added to the register first, then the spec.
- Each spec keeps the same seven sections (purpose/scope, current state, requirements, data,
  rules, acceptance criteria, deferred/open). "Current state" is re-verified against the repo when
  the spec changes.
- A feature's spec is updated in the same PR that changes the feature's behaviour.

## Architecture in one page

- **Layers:** Identity → Data → Trust → Intelligence → Experience → Distribution.
- **Non-negotiables N-01–N-14** (`docs/decisions.md` §N): immutable IDs; exam → cycle → entry;
  `source_type` + `verification_status` with unknown as a real state; taxonomy tables;
  `claim_status`; audit-logged critical fields; SSR + generated JSON-LD; non-indexable facets;
  minors' data isolated; app reads `api.*` only (public pages); no Supabase CLI/MCP/service key;
  no source names in values; trust law; nothing scraped is published without a person.
- **Stack** (D-070): Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 + shadcn/ui,
  Supabase Postgres + PostGIS + Auth, Vercel (`bom1`), MapLibre, Zod + Server Actions, Biome,
  Vitest, Playwright. Database `ybevzpryuvgxclkhdjld` in `ap-south-1` (D-071, D-083).
- **Record → views → surfaces:** every value is an observation with a source
  (`field_provenance`); resolved values live on the entity tables; `api.*` views apply publishing
  rules; pages, `index.md`, JSON-LD, widget, sitemaps and alerts are all generated from views.
- **Repos:** data session owns tables until it retires; this repo owns views, grants, RLS,
  publishing rules, UI and write paths (D-072, D-091). See `data-and-trust.md` §1.

## Feature map

| Spec | Covers | Season milestone | State (27 Sep) |
|---|---|---|---|
| `urls-and-routing.md` | **Frozen** canonical URL & routing architecture (D-121): entity roots, slugs, redirects, lifecycle, CI invariants | phase 1 done 28 Sep | `/school/{slug}`, `/schools/{state}/{city}/{locality}`, `/exams/{slug}` live; campus views reserved (301); teacher slugs phase 3 |
| `school-entity-page.md` | School page (Overview, `/admissions`, `/fees`), provenance precedence, parent fee reports, index gate, widget, SEO/AI layer; build milestones M0–M4 | M1 15 Oct · M2 1 Nov · M3 15 Dec | Overview built; tabs, fees, gate, widget not built |
| `admissions-tracker.md` | City admissions page, status model, age checker, documents, RTE info, alerts + digest, report/request update | 15 Oct | Sign-up + age checker built; sending, city admissions page, reports not built |
| `exams.md` | Exam hub + exam pages (RMS CET live), exam cycles/milestones, exam alerts | live; fixes by 15 Oct | Page live; JSON-LD/breadcrumbs + Hindi (RMS CET only) shipped 30 Sep; view still not in repo, colour violations remain |
| `discovery.md` | Home/city picker, city + locality pages, search, filters, compare, shortlist, share, guides | 15 Oct | Built, with search and indexing gaps |
| `school-portal.md` | Claim (v1 live, v2 1 Nov), portal, admissions editor, notices, fee verification, enquiries, widget, sponsored | 1 Nov · sponsored 1 Dec | Claim v1 + portal basics built |
| `concierge.md` | Application help: packages, orders, intake, document vault, fulfilment, payments | 1 Nov | Parent flow built on mock payments; fulfilment board, school picks, Razorpay not built |
| `ops-console.md` | Queues, record editor, call queue, moderation, orders, coverage dashboard, WhatsApp inbox | 15 Oct (calls) · 1 Nov (moderation) | 7 queues built; calls, moderation, dashboard not built |
| `openseat.md` | Seat availability, school updates, parent labels, seat requests (P2) | in season | Tables + portal update built with bugs; no public display |
| `teachers.md` | Light teacher profiles, claims, affiliations, direct messaging | frozen until 1 Nov (D-105) | Built; claims unused; a data leak to fix |
| `data-and-trust.md` | Data access contract, publishing rules, render/index levels, routing | — | Built; UDISE + gate changes pending |
| `access-control.md` | Roles, RLS model, auth, rate limits, headers | — | Built |
| `data-requests.md` | Queue of table changes for the data session | — | Open |

## Known issues found during consolidation (27 Sep)

Verified by reading the code; each spec's §2 has the detail. Fix P0 items before 15 Oct.

| Sev | Issue | Spec |
|---|---|---|
| P0 | `20260925111631_narrow_school_claims_grants.sql` revokes the writes ops needs on `school_claims`/`school_members`; if applied, claim approval fails silently (errors unchecked) | `school-portal.md` |
| P0 | Anon has no insert on `update_reports` (revoked 25 Sep) — public "Report an update" can't work; use a narrow `api` function | `admissions-tracker.md` |
| P0 | Approving a notice doesn't create or update an admission cycle, and no ops screen edits cycles — nothing approved reaches the page | `ops-console.md` |
| P1 | `020_public_school_admissions.sql` gates on legacy `verification`, stores `closing_soon`, counts days in UTC | `admissions-tracker.md` |
| P1 | Age checker sends the DOB to the server (`?dob=`), against D-067 | `admissions-tracker.md` |
| P1 | Alerts: following a second school replaces the list; class picker lacks Nursery/KG; unsubscribe needs sign-in and withdraws all consents | `admissions-tracker.md` |
| P1 | City cards pick the earliest last date across all sessions, so a closed cycle can hide an open one | `admissions-tracker.md` |
| P1 | `api.public_exam_admissions` has no file in `db/views/` and isn't checked by `verify:views`; `types.ts` stale | `exams.md` |
| P1 | Exam page uses non-token amber/red/white colours (D-050), mixes academic years, lacks freshness (`FreshnessLine`/`VerificationChip` unused) | `exams.md` |
| P1 | Exam page lacks JSON-LD/breadcrumbs | `exams.md` — **fixed** (30 Sep) |
| P1 | OpenSeat: second save fails on the unique key; schools can't update after ops confirms; every class defaults to "closed"; reject deletes the row | `openseat.md` |
| P1 | Concierge: uploads over 1 MB fail (Server Action body limit); ops can't open vault files; "approve" marks an application submitted; consent logged against unseen notices; Aadhaar masking unchecked; amount posted from a hidden field; CSP blocks Razorpay | `concierge.md` |
| P1 | `api.public_teachers` reads raw `schools`, so a teacher can show an unpublished school's name (also in `Person` JSON-LD) | `teachers.md` |
| P1 | Rankings guide doesn't attribute the publisher (D-088); `080`/`090` view files contain `GRANT` lines | `discovery.md` |
| P2 | Search is a substring match on the English name; class filter uses max class; shortlist needs sign-in; WhatsApp share unused | `discovery.md` |
| P2 | `src/lib/freshness.ts` still applies a flat 7-day stale rule (D-087) | `admissions-tracker.md` |
| P2 | No audit triggers on `update_reports`, `correction_requests`, `admission_notices`, `ops_tasks` (N-06) | `ops-console.md` |
| P2 | Messaging has no report/block (D-105); account export omits conversations/messages | `teachers.md` |
| P2 | Several `/ops` actions ignore database write errors | `ops-console.md` |
| P1 | JSON-LD `propertyID` said "Schooloy School ID" (`[entitySlug]/page.tsx`), against D-081 — **fixed** (28 Sep) | `school-entity-page.md` |
| P1 | `localeAlternates()` (`src/lib/seo.ts`) always emits `hi-IN`, against D-086 — **fixed** (28 Sep, D-121: no hreflang until a page is translated) | `urls-and-routing.md` |
| P1 | Hindi completeness gate computed for the hreflang tag only; routing (`proxy.ts`) redirected every `/hi/*` regardless, and the exam page never rendered any `_hi` column — so `/hi/exams/rms-cet` 301ed to English even once RMS CET's Hindi data was complete — **fixed** (30 Sep, D-127: `exams` carve-out in `proxy.ts` + page renders `_hi` fields + redundant page-level redirect guard) | `exams.md`, `urls-and-routing.md` |
| P1 | No `cacheTag` anywhere in `src/`, so `/api/revalidate` is a no-op — edits don't refresh cached pages | `school-entity-page.md` §12.4 |
| P2 | `public-adapter.ts` keeps two unused raw sub-queries (`school_identifiers`, `field_provenance`) against N-10 — **fixed** (28 Sep) | `data-and-trust.md` |
| P2 | `robots.ts` lists 4 AI crawlers; target list has 7 — **fixed** (28 Sep) | `docs/guidelines/seo-geo.md` |

## Season timeline (from the specs)

| Date | Milestone |
|---|---|
| 3 Oct | M0: data requests R-01–R-07 applied; Gurugram city assignment; P0 bugs fixed |
| 15 Oct | Tracker live; M1 school page (admissions-first, index gate); call queue; `SITE_INDEXABLE` on as soon as Jaipur pilot list is at L2 (D-114) — target this week |
| 1 Nov | Concierge; claim v2 + widget; fee report intake; Gurugram pilot (D-080) |
| 15 Nov | Hindi city + tracker pages (D-086) |
| 1 Dec | Sponsored placements on list pages (D-089) |
| 15 Dec | M3: fee verification, change monitor, organisations, contacts/links |
| Jan–Feb 2027 | M4 hardening; RTE guides (Rajasthan late Jan, Haryana March) |
