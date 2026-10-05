# Exams — Developer Spec

**Status:** exam page shipped (RMS CET); hub shipped; JSON-LD/breadcrumbs shipped (30 Sep); Hindi shipped for RMS CET only, partial (30 Sep — see §5 and the "Open (Prav)" list in §7); alerts, remaining SEO structure, history not built · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** N-02, D-012, N-03, N-06, N-07, N-10, N-13, D-024, D-025, D-026, D-045, D-046, D-047, D-049, D-050, D-064, D-067, D-081, D-086, D-087, D-091, D-098, D-101, D-107, D-108 (see `docs/decisions.md`) · **Guidelines:** `docs/guidelines/seo-geo.md`, `docs/guidelines/content-and-trust.md`, `docs/guidelines/design.md`

## 1. Purpose and scope
Exam pages are the authority pages for school-entry exams: one evergreen page per exam that gives a parent the current cycle's dates, who can apply, fees, seats, centres and schools, checked against the official bulletin and more accurate than coaching and aggregator pages. The underlying model (exam → cycle → milestones, N-02) is the product; the page renders it.

**In scope**
- `/[locale]/exams` hub and `/[locale]/exams/{slug}` page, with no city segment (D-012).
- Exam → cycle (one `admission_cycles` row per class per academic year) → milestones, fee tiers, reservation splits; exam-level centres, participating schools, helpdesk.
- Browser-only age-eligibility checker (D-067).
- "What other sites get wrong" corrections, a warning about touts, and WhatsApp sharing.
- Exam alerts via `alert_subscriptions.exam_ids` (D-064).
- SEO/GEO for exam pages (N-07, D-045..D-049).
- RMS CET now; Sainik School and JNV/Navodaya added as data, not code (D-012).

**Out of scope**
- JEE, NEET, CUET: parked (D-012, Parked list).
- A city-scoped exam URL such as `/[city]/exams/...` (D-012).
- Separate URLs per intent (dates, eligibility, syllabus, result pages). The Admissions Platform doc proposed these, but D-012 says "one evergreen page per exam". Intents stay as in-page sections with anchors.
- An automated ingestion or scraping worker for bulletins, and an interactive WhatsApp bot. Both are Admissions Platform Phase 2 and stay subject to N-14 and D-025.
- Paid help with exam forms. The concierge is D-010/D-095 and has its own spec. The exam page only links to `/[locale]/admissions/help`.

## 2. Current state (verified against the repo on 27 Sep 2026)
**Routes**
- `src/app/[locale]/exams/page.tsx` is the hub. It shows one card per exam with name, classes, conducting body, first academic year and a `StatusPill`, and has an empty state. `revalidate = 900`.
- `src/app/[locale]/exams/[slug]/page.tsx` (~780 lines) is the exam page. It renders `BreadcrumbList` + one `Event` JSON-LD per cycle (shipped 30 Sep), the `h1` with the locale-appropriate name (`name_hi` when `locale === "hi"` and present, else `name_en`; the other language shown as a subtitle), a visible EN/HI toggle when the exam qualifies (see §5), the tout banner, a WhatsApp share, the `EligibilityChecker` (still English-only, not wired to the dictionary — see §7), and one `CycleCard` per cycle. Every subcomponent now takes `locale`/`dict` and renders `_hi` fields (eligibility notes, milestone label/detail, fee-tier category, reservation-split label) when the current locale is `hi` and that field has a value, falling back to English otherwise — pattern/syllabus/application-steps/corrections/participating-schools/exam-centres have no `_hi` columns at all yet and always render English (deliberate code-mixing per D-086's "numbers and dates stay in the same format as English", not yet decided for prose). `revalidate = 900`. The page is marked `// design-pending`.
- The sitemap is `src/app/sitemap-site.xml/route.ts`: `/exams` plus `/exams/{slug}`, with lastmod taken from `lastCheckedAt`.
- Nav: `src/components/shell/site-header.tsx`, `site-footer.tsx`.

**Server modules and contracts**
- `src/lib/db/public-adapter.ts` has `getPublicAdmissionsByExamSlug()` (newest `academic_year` first, then `closes_on`) and `listPublicExams()`.
- `src/contracts/public-exam-admissions.ts` holds `publicExamAdmissionContract` and its sub-schemas: milestone, fee tier, reservation split (`level: primary | within_group | special`), centre, participating school, application step, correction.
- `src/lib/eligibility.ts` does pure date math: `classifyEligibility` returns eligible / too_young / too_old / unknown. `src/components/admissions/eligibility-checker.tsx` is the client island.
- A standalone `/[locale]/tools/age-eligibility` exists, built from `design/Age Checker.dc.html` (screen-map row 6).

**Data (live, created by the data session / Admissions Platform work)**
- `exams` holds slug, bilingual name, conducting body, `class_codes`, official site, `helpdesk_phone`, `helpdesk_email` and `info_site_url`.
- `admission_cycles.exam_id` is XOR with `school_id` (CHECK constraint). It carries these exam-only columns: `late_fee_amount`, `eligibility_notes_en/hi`, `selection_notes`, `pattern`, `syllabus`, `application_steps`, `corrections` (jsonb).
- Child tables: `exam_cycle_milestones`, `exam_fee_tiers`, `exam_reservation_splits` (cycle-scoped), plus `exam_centres` and `exam_participating_schools` (exam-scoped).
- `admission_notices.exam_id` and `alert_subscriptions.exam_ids` exist.
- `api.public_exam_admissions` returns one row per cycle, with the child tables aggregated as `jsonb_agg` and the `days_to_close` column as in `api.public_school_admissions`.
- Seeded data: RMS CET 2027-28, Class 6 and Class 9 cycles, 10 milestones each, 63 centres, 5 schools, 16 reservation rows, 7 corrections.
- Commits: `ac0e224`, `3ff1a46`, `16ae5e7`, `a8f6e49`, `69173fb`, `d30904c`.

**Gaps found**
- **The view has no source file in the repo.** Nothing in `db/views/` or `supabase/migrations/` mentions exams, and the contract's header points to a non-existent `db/views/0??_public_exam_admissions.sql`. The view was rebuilt with DROP+CREATE outside the repo.
- `scripts/verify-views.ts` does not check `publicExamAdmissionContract`.
- `src/lib/db/types.ts` has the exam columns on `admission_cycles` but no `exams` or `exam_*` tables. It also lacks `admission_notices.exam_id` and `alert_subscriptions.exam_ids`.
- Alerts: `src/app/[locale]/alerts/actions.ts` writes only `school_ids`. Nothing reads or writes `exam_ids`.
- **Fixed 30 Sep:** the exam page now has `BreadcrumbList` + `Event` JSON-LD, and renders real `_hi` fields (was previously computing an `examHasCompleteHindi()` gate for hreflang but never actually using any `_hi` column anywhere in the template — the hreflang tag was advertising a Hindi page that didn't exist). **Still open:** no `index.md` twin; doesn't use `FreshnessLine` or `VerificationChip`; `src/proxy.ts`'s blanket `/hi/*` → English redirect (§6 of `urls-and-routing.md`) now has a narrow carve-out for the `exams` root only (see that doc) — every other root is unchanged.
- `docs/screen-map.md` and `docs/design-gaps.md` have no exam rows, even though the page comment points to design-gaps.
- There is no `/ops` UI for exams. Data is seeded from the terminal.
- Token violations in `[slug]/page.tsx`: `bg-amber-50`, `border-amber-300`, `text-amber-900`, `text-white` and `decoration-red-400`. The last one is red outside a deadline, which breaks D-050. The page also uses a `Math.random()` React key (line 207).

## 3. Requirements
### Parent
**Exam page `/[locale]/exams/{slug}`**
1. **P0 Summary card first.** Above everything else, show one card for the current cycle. It shows the status pill with a text label (D-050), "Last date to apply", exam date, fee from the lowest tier upward, and one "Apply on {official domain}" button that opens `form_url`. The countdown is computed on the server in IST.
   - With multiple class cycles, show one row per class inside the card.
   - Copy is at roughly Class 6–8 reading level: "Who can apply", "Last date to apply".
2. **P0 Current cycle only.** The page renders the cycles whose `academic_year` is the newest one returned. Older cycles are never deleted (N-02) and never mixed into the current view. They appear under "Previous years" (see item 19).
3. **P0 Freshness on every fact block.** Use `FreshnessLine` to show "Checked N days ago · {notice title}" from `last_checked_at` and `notice_url`.
   - The stale threshold follows D-087: 3 days while the cycle is open or closing, 14 days when it is upcoming or not announced.
   - A stale block shows the "re-checking" marker. It is never hidden (D-026).
4. **P0 Unknowns are shown as unknown.** A missing milestone date shows "Not yet published", replacing today's "Date TBA" (D-049). A section with no data is omitted. Its facts are never guessed.
5. **P0 Conflicting bulletin statements are shown.** Example: the RMS CET bulletin gives the correction window as both 27–28 Oct and 29–30 Oct. Show both dates with "The bulletin gives two dates; confirm on {site}". The row carries `verification_status = 'conflicting'` (N-03).
6. **P0 Eligibility checker keeps working as built.**
   - It checks one DOB against every current cycle.
   - It returns three buckets: eligible and open (Apply link), eligible but not open, or not eligible (with how far off, and the closest matching class).
   - Nothing is sent or stored. The copy says so (D-067).
7. **P0 Sections in this order, each an anchor:** Dates → Who can apply → Fee → Seats → Exam pattern and merit → Syllabus → How to apply → Exam centres → Schools → What other sites get wrong → Official links.
   - Sections render from the view. The page has no hard-coded exam text.
8. **P0 Tout warning.** Keep the banner. Its wording must never imply that SchoolOye can improve selection chances (N-13, D-010).
9. **P1 Participating schools link out.** When `school_id` is set and the school is public, link to its canonical `/[locale]/[city]/[slug]-[school_code]` (D-040). Otherwise show plain text.
10. **P1 Centres.** Group centres by state and put the parent's state first when a city cookie is set. Show the city name and code, e.g. "Jaipur (RJ06)".
11. **P1 WhatsApp copy generated from data.** Build the text on the server from the view. The template below, from the prototype, is rebranded and never hard-coded:
    ```
    *{name_en} {academic_year} ({class list})*
    Apply online: {opens_on} – {closes_on}
    Late window: {late milestone dates} (₹{late_fee_amount} extra)
    Exam: {exam-date milestone}
    Fee: ₹{tier 1} (₹{tier 2} {tier 2 label})
    Age: {class} born {dob_from} – {dob_to}; …
    Apply only at {official_site host}
    — via SchoolOye {canonical URL}
    ```
    Leave out any line whose source value is null.
12. **P1 Hindi.** Shipped for RMS CET (30 Sep), unassigned for every other exam.
    - Render `name_hi`, `label_hi`/`detail_hi`, `eligibility_notes_hi`, `group_label_hi` and `category_label_hi` on `/hi` — **done**, gated per-exam by `examHasCompleteHindi()` (`@/lib/i18n-completeness`): every field listed must be non-null on every cycle, or the page 301s `/hi/exams/{slug}` → the English canonical instead of rendering. RMS CET's gaps (`eligibility_notes_hi`, `category_label_hi`, `group_label_hi` were null) were filled directly in Supabase 30 Sep, AI-drafted then reviewed inline, not through a review queue — there is no `DRAFT_MT → REVIEWED → PUBLISHED` pipeline (§7).
    - UI strings come from the translation catalogue (D-086) — **done for the exam page's own chrome and every existing site-wide string** (`src/i18n/locales/{en,hi}.json`, `hi` now registered in `dictionary.ts` — it was never registered before 30 Sep, so no page anywhere could have rendered Hindi UI even if it had Hindi data). `EligibilityChecker` is the one component on this page not yet wired to `t()` (§7).
    - Structured facts stay single-sourced, with only prose stored per locale — **holds**, no schema change; the per-field `_hi` columns already on `admission_cycles`/`exam_cycle_milestones`/`exam_fee_tiers`/`exam_reservation_splits` are what §5 gates on, not a new translations table.
    - Until an exam's Hindi prose is complete, apply the rules in §5 — **done**, via the gate above plus a matching redirect the exam page itself enforces (not just a hidden hreflang tag).
13. **P2 Change log.** Show a visible entry for each date or fee change on a current cycle, e.g. "Exam date moved from 7 Dec to 14 Dec — official notice, updated 3 Nov". The data comes from the N-06 `audit_log`, through a new `api` view.

**Hub `/[locale]/exams`**
14. **P0** One card per exam: name, classes, conducting body, current academic year, and a pill from the *current* cycle. Today it uses the soonest `closes_on` across all years, which is wrong once a past cycle exists.
15. **P0** Heading and intro say "School entrance exams". The existing empty state stays.
16. **P1** Order: open or closing first, then upcoming, then not announced, then closed.

**Alerts**
17. **P1 "Get WhatsApp alerts for {exam}" on the exam page.** It uses the existing phone and OTP sign-up at `/[locale]/alerts?exam={slug}`.
    - The consent row has purpose `whatsapp_alerts` (D-069).
    - The action appends to `exam_ids` and never overwrites the parent's `school_ids`.
    - `city_id` is NOT NULL, so exam subscribers pick a city just as school subscribers do.
18. **P1 Alert triggers for an exam (D-064):** the application window opens, 3 days before and deadline-day morning (08:00 IST) before `closes_on` (D-098 timing), any milestone date changes, the admit card window opens, and results are published. Exam alerts go into the same weekly digest, and one tap unsubscribes.

**History**
19. **P2 Past cycles.** Show read-only past cycles at `/[locale]/exams/{slug}/{yyyy-yy}`, mirroring D-042, with `noindex` until each has content beyond dates. See §7.

### Ops
20. **P0 Adding an exam or cycle is data only.** Sainik, JNV and NDA need no new page code.
    - Every cycle is set to verified by a person against the official bulletin before it appears. The view's gate enforces this (D-025, N-14).
    - Until a `/ops` exam editor exists, Claude Code seeds from the terminal. It records `source_type`, `verified_at` and `verified_by`.
21. **P1 Re-check loop.** Put exam cycles into the D-065 `next_check_on` loop, re-checking every 3 days within 7 days of `closes_on`, and again whenever a linked `admission_notices` row with `exam_id` changes.
22. **P2 `/ops` exam editor.** CRUD for cycles and child tables, with the notice PDF shown alongside.

### School
23. No school-side actions on exam pages. A participating school's own admission cycle belongs on its school page.

## 4. Data
**The UI reads only** `api.public_exam_admissions` (N-10). The grain is one row per cycle. Exam-level arrays (centres, participating schools, application steps, corrections) repeat on every row.

**Backfill into the repo (this repo, non-destructive, P0)**
1. Take the live definition with `pg_get_viewdef('api.public_exam_admissions'::regclass, true)` and commit it as `db/views/110_public_exam_admissions.sql`, containing `CREATE OR REPLACE VIEW` only.
2. Add a migration for the grant, applied via `pnpm db:migrate <file> --confirm`:
   ```sql
   GRANT SELECT ON api.public_exam_admissions TO anon, authenticated;
   ```
3. Add `{ name: "api.public_exam_admissions", contract: publicExamAdmissionContract }` to `scripts/verify-views.ts`.
4. Regenerate types with `pnpm db:types` so that `exams`, the `exam_*` tables, `admission_notices.exam_id` and `alert_subscriptions.exam_ids` appear.

**View changes (this repo, P0/P1)**
- The publish gate should use `verification_status = 'verified'` instead of the legacy `verification` enum (N-03 transition).
- Expose `verification_status` so that "conflicting" can render.
- Expose `source_type` so the D-024 label can be chosen.
- Expose milestone `kind` (e.g. `exam_date`, `late_window`, `admit_card`, `result`) so the summary card and WhatsApp text do not match on `label_en` strings.
- Expose `notice_title` and `notice_published_on` from `admission_notices` via `exam_id`, for the "Checked against {notice}, dated X" line.
- Expose a current-year flag, or leave "current year" to the adapter.

**Table changes (data session, D-091, additive only)**
- `exam_cycle_milestones.kind text` with a CHECK list.
- ~~An exam-level `hi_ready boolean`~~ — superseded 30 Sep: no new column was added. Completeness is computed per request from the existing per-field `_hi` columns (`examHasCompleteHindi()` in `@/lib/i18n-completeness`), not stored. See §5.
- `admission_status` already has `postponed` and `cancelled` in the live database (the generated `src/lib/db/types.ts` is stale — regenerate with `pnpm db:types`). Use them; also record the changed milestone in the change log.

**Alerts write**
- `alert_subscriptions.exam_ids uuid[]` is written by the owner's RLS-scoped Server Action only.
- Exam alerts store no child data. Class codes plus `exam_ids` are enough (D-067).

## 5. Rules
- **Trust (N-13, D-027).** Official bulletins and notices are the only sources. Aggregators and coaching sites are never sources. The corrections table names no competitor and cites the bulletin only. The page never implies SchoolOye affects selection.
- **Provenance labels (D-024, amended by D-107).** Label bulletin-derived facts "From the official notice · {issuer}, dated {date}" (D-107). "Official record" is never used on exam pages (see §7).
- **Visual (D-050).** Red is used only on the deadline margin when `closes_on` is 0–7 days away.
  - The corrections table's strike-through uses slate, not red.
  - Replace every `amber-*`, `white` and `red-*` utility with a token. Add a `caution` token if one is missing.
  - Every pill has a text label. The minimum text size is 14 px.
- **Privacy (D-067..D-069).** The DOB in the checker never leaves the browser. There is no analytics event carrying the DOB. Alert sign-up records a per-purpose consent.
- **SEO/GEO.**
  - Exam pages are indexable entity pages (D-108: D-053 applies only to listing/filter/landing pages).
  - Follow `docs/guidelines/seo-geo.md`. The page needs one `h1`, a visible breadcrumb (Home → Entrance exams → {exam}) plus `BreadcrumbList`, and generated JSON-LD (N-07).
  - JSON-LD: an `Event` for each current cycle's application window and one for the exam date. `organizer` is the conducting body, `eventStatus` is `EventScheduled` (or `EventPostponed` from the change log), and `url` is the canonical page (D-045). No `AggregateRating` or `Review`.
  - FAQ only with ≥3 real facts (D-046). No invented GEO paragraphs (D-047).
  - Add a `/[locale]/exams/{slug}/index.md` twin and a `llms.txt` entry (D-048) at P1.
  - The title keeps the year out of the URL but has it in the text, as today.
- **Hindi (D-086).** Emit `hi-IN` hreflang and serve `/hi/exams/{slug}` only when the exam's cycles are fully translated: `name_hi`, every cycle's `eligibility_notes_hi`, every milestone's `label_hi`, every fee tier's `category_label_hi` are all non-null (`examHasCompleteHindi()`, `@/lib/i18n-completeness` — checked live against the view, not a stored flag). Until then, `/hi/exams/{slug}` 301s to the `/en` canonical — both at the routing layer (`src/proxy.ts` passes the `exams` root through instead of redirecting, then the page itself redirects if the gate fails) and, redundantly, inside the page component, so a future change to either layer alone can't let an incomplete translation render. **Fixed 30 Sep** for RMS CET: the gate used to be computed only for the hreflang tag and never consulted by routing or rendering, so the tag advertised a Hindi page that `/hi` would actually 301 away from, and even a request that reached the page template never read any `_hi` column. Every other exam (Sainik, JNV) still fails the gate today because their `_hi` columns are null, which is correct — see §7 for what's unassigned.
- **Performance.** The eligibility checker is the only client island. First paint needs no client-side data fetch. The exam page uses the same ≤60 KB app-JS target as the school page (D-051).

## 6. Acceptance criteria
- [ ] `db/views/110_public_exam_admissions.sql` exists, the grant is in `supabase/migrations/`, and `pnpm verify:views` parses the exam view with 0 contract errors.
- [ ] `src/lib/db/types.ts` includes `exams`, `exam_cycle_milestones`, `exam_fee_tiers`, `exam_reservation_splits`, `exam_centres`, `exam_participating_schools` and `alert_subscriptions.exam_ids`.
- [ ] `/en/exams/rms-cet`:
  - The summary card is the first element after the `h1`.
  - Only the 2027-28 cycles render.
  - Each block shows "Checked N days ago · {source}".
  - The correction-window conflict shows both dates.
- [ ] No `amber-`, `red-`, `white`, hex or `[...]` colour utilities remain in `src/app/[locale]/exams/**`. `pnpm lint` is clean. No `Math.random` keys.
- [x] View source contains one `h1`, a `BreadcrumbList` and `Event` JSON-LD (shipped 30 Sep). - [ ] Google Rich Results test shows no errors (not yet run against production).
- [x] `/hi/exams/rms-cet` renders real Hindi labels and hreflang pairs (RMS CET passes `examHasCompleteHindi()` as of 30 Sep). - [ ] An exam that fails the gate (Sainik, JNV once added) redirects `/hi/exams/{slug}` → `/en/exams/{slug}` rather than rendering `noindex` — confirm this once a second exam has partial `_hi` data to test against; RMS CET alone can't exercise the failure path.
- [ ] With the date set to 2030 in a test, the hub pill for RMS CET reflects the newest cycle, not the soonest-closing old one.
- [ ] Eligibility unit tests cover eligible, too young, too old, falling into the other class's window, and unknown. A Playwright check confirms no network request carries the DOB.
- [ ] The WhatsApp text for RMS CET matches the template above and omits lines whose source value is null. Brand "SchoolOye" (D-081).
- [ ] An exam alert subscription writes `exam_ids`, leaves `school_ids` intact, and creates a `whatsapp_alerts` consent row.
- [ ] `docs/screen-map.md` has rows for `/exams` and `/exams/[slug]` marked built-from-components. `docs/design-gaps.md` has an "Exam page" row.
- [ ] Adding a test exam from the terminal renders a complete page with no code change.

## 7. Deferred and open
**Deferred**
- Past-cycle URLs `/exams/{slug}/{yyyy-yy}`, when the first cycle closes (after the RMS CET final merit list, Mar 2027).
- A `/ops` exam editor, when a third exam goes live.
- The change log from `audit_log`, when the first real postponement happens.
- Automated bulletin ingestion, per the deferred "automated change detection" item.
- Interactive WhatsApp Q&A, after the WhatsApp provider is chosen (D-095 open).
- Bulletin appendices (hospital list, certificate templates, pages 41–63), which have low parent value.

**Settled since 27 Sep**
- **NDA in D-012:** settled by D-101, which amends D-012. Exams covered are school-entry and school-stage exams — RMS CET live; Sainik, JNV next; NDA later, as notification tracking only (not a full exam page). Never JEE/NEET.
- **In-page intent sections becoming their own URLs:** settled by D-101. Intent sections (dates, eligibility, syllabus) stay on the one exam page; they never get separate URLs.
- **Which D-024 label applies to exam bulletin facts:** settled by D-107, which amends D-024 with "From the official notice · {issuer}, dated {date}".

**Settled since 30 Sep**
- **Hindi exam pages, which exam, by when:** RMS CET shipped 30 Sep, ahead of and independent of the 15 Nov D-086 city/tracker date — Prav authorized it directly rather than waiting for a scheduling answer. Sainik and JNV are not scheduled; they need their own `_hi` data filled (code is already exam-agnostic) before they can pass the same gate.

**Open (Prav)**
1. **`EligibilityChecker` is the one exam-page component not wired to the dictionary.** It renders hardcoded English on `/hi` pages that otherwise render Hindi. Low effort, not done 30 Sep only because the page was already a large diff.
2. **Shared label utilities (`classLabel()`, the deadline/status-pill text) are not localized.** They're used across exam and school pages, so fixing them is a cross-feature change, not a one-page edit.
3. **No translation review pipeline.** RMS CET's `_hi` fields were AI-drafted and used directly, with no `DRAFT_MT → REVIEWED → PUBLISHED` state — is that acceptable for parent-facing content generally, or only as a one-off to unblock RMS CET?
4. **Raw server-rendered HTML still ships `lang="en"`** on genuinely-Hindi pages; a client-side effect (`HtmlLangSync`) corrects it after hydration, but a non-JS crawler or screen reader that reads the initial response sees the wrong value. The real fix is Next's "multiple root layouts" pattern (splitting `src/app/layout.tsx` per top-level route), which touches `/portal`, `/ops`, `/for-schools`, `/auth` and `/dev` too — deliberately not attempted blind in this session.
