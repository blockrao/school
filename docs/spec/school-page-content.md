# School detail page — content and data specification (15 Oct 2026)

Input to the next task (UI/UX design of the school page). This answers: what belongs on a school page, in what order, what data each block needs, and what the database must gain. It extends, not replaces, `school-entity-page.md` (v2 design, DDL in §6).

## 1. Evidence

**Indian competitors** (six school pages read: Careers360, Edustoke, SchoolMyKids, Ezyschooling, Schools Universe, GetSchoolsInfo; Justdial, Sulekha, Shiksha not verifiable).
- Present on nearly all: enquiry/callback form 6/6, fee table 6/6 (only two go per class), quick facts 5/6, student-teacher ratio 5/6, contact+map 5/6, FAQs 4/6, similar schools 4/6, facilities 4/6.
- Present on almost none: per-class admission dates 1/6, documents list 1/6, board results with data 0/6, seats 0/6, transport 0/6, source labels per fact 2/6.
- Every page contradicted itself on fees or counts (e.g. one quoted a ₹2.10, 2.20 and 2.30 lakh admission fee on the same page). Contact details were login-gated on 4/6. Ratings and letter grades appear with no method. Empty tabs and blank fields are common.
- Closest to our model: SchoolMyKids (per-claim source labels, a "questions to ask" checklist) and GetSchoolsInfo (public-records label, source links).

**International** (verified: GreatSchools, Niche, MySchool Australia, Singapore MOE SchoolFinder; England sources not verified).
- Government-grade profiles share: identity and codes, enrolment, staff counts, attendance, contact, special-needs support, programmes and co-curriculars, and a visible "last updated" date. Singapore carries no ratings and no scores. MySchool compares only against statistically similar schools and labels the school's own text. England's Ofsted (since Nov 2025) uses several dimensions and no single grade.
- Pitfalls: GreatSchools-style composite scores have been criticised for tracking race and income; raw results mostly measure intake; crowd reviews are gameable; Niche sells promotion to ranked schools; missing data scored as zero is unfair. Show "not reported", never a zero.

**Parents** (India; query-volume data not found, so query patterns below are inference).
Ranked needs: (1) itemised fees and year-on-year change, (2) verified board and affiliation, (3) admission window, age cut-off, documents, selection method, (4) teacher counts and ratio, (5) safety and compliance certificates, (6) location, commute, transport, (7) board results, (8) contact and principal, (9) medium of instruction (stated vs real), (10) class size, (11) RTE 25% participation, (12) infrastructure, (13) inclusion staff, (14) governance, (15) boarding and calendar. CBSE's mandatory public disclosure (Appendix IX) and UDISE+ already define most of these as verifiable fields; only about 9,000 of 26,000+ CBSE schools had published a disclosure when last reported, so a verified, readable version is a real gap.

## 2. Where SchoolOye stands today

- Page sections now: facts, admissions, recent updates, what's happening, location, teachers, what SchoolOye knows, nearby schools, contact.
- Gurugram data (375 published): populated — management 374, medium 375, established year 375, principal 375, phone 363, email 365, website 220, UDISE code 365. Empty — about 0, affiliation number 0, verified date 0, geocode 10, admission cycles 0, facilities 0, media 0. `fee_items` exists and is empty.
- Missing as tables or fields: staffing and ratio, enrolment, board results, compliance certificates, transport, timings/calendar, RTE participation, campus area, boarding, fee history.

## 3. Recommended page, in order

Each block names the parent question it answers. Every value carries source, as-of date and verification state; unknown shows "Not reported", never blank, never zero.

| # | Block | Answers | Data | Today |
|---|---|---|---|---|
| 1 | Header + snapshot sentence | What is this school, in one line? | name, campus, locality, board, grades, gender, day/boarding, medium, record badge, last verified | partial |
| 2 | At a glance | The facts parents check first | board + affiliation no. + validity, management, established, principal, UDISE code | partial |
| 3 | Admissions (per entry class) | Is it open? When? Who can apply? | window, age cut-off + reference date, documents, selection method, seats status, application fee, official form link, prospectus, alert CTA | table exists, empty |
| 4 | Eligibility check | Can my child apply? | DOB entered in browser, not stored | exists |
| 5 | Fees | What will it really cost? | itemised heads per class, one-time vs annual, basis label, year-on-year change, what is not included | table exists, empty |
| 6 | Academics and results | How do students do? | curriculum, XI–XII streams, languages, last 3 years Class X/XII appeared, passed, % with cohort size | missing |
| 7 | People | Who teaches? | principal, teacher counts by category, student-teacher ratio, qualified share, special educator, counsellor (aggregates only, no named staff) | missing |
| 8 | Safety and compliance | Is it legitimate and safe? | affiliation status, fire / building / sanitation validity, society registration, CCTV, grievance and POCSO contacts, RTE recognition, state fee-filing | missing |
| 9 | Campus and facilities | What is on site? | campus area, classrooms, labs, library, sports, toilets, internet, accessibility, boarding; tri-state status (available / not available / not confirmed) | table exists, empty |
| 10 | Daily life | How does a day work? | timings, session start, calendar, transport (offered, coverage, fee band), co-curriculars | missing |
| 11 | RTE and inclusion | Is there a free-seat route and support? | RTE 25% participation, seats, how to apply, special-needs support | missing |
| 12 | From the school | What does the school say about itself? | school-authored history, philosophy, programmes, achievements; always labelled as the school's own words; shown only when supplied | new (portal) |
| 13 | Photos and documents | Can I see it and read the originals? | media with caption, alt text, source, date; prospectus, affiliation letter, mandatory disclosure, fee circular, calendar | media table exists; documents new |
| 14 | Location and commute | How do we get there? | map, address, nearby landmarks, nearby schools (with status) | partial |
| 15 | Contact and enquiry | How do I reach them? | phone, email, website, hours — never login-gated; enquiry routed through SchoolOye | exists |
| 16 | Updates, news, events, jobs | What is new? | school posts | exists |
| 17 | Questions to ask the school | What should I check on a visit? | generated checklist from missing/uncertain fields | new |
| 18 | FAQ | Direct answers | generated from the data, plain text, no FAQPage markup | rebuild |
| 19 | Sources and verification | Can I trust this? | per-field source, date, evidence link, conflicts, report-an-update | partial |

Deliberately absent: star ratings, letter grades, composite scores, paid ranking, unmoderated reviews. Parent input is limited to labelled fee reports with evidence.

Block order puts decisions before reassurance: admissions and fees come before academics, because they are what a visitor came to check.

## 4. Database changes

Existing and reusable: `admission_cycles` (class, dates, dob range, docs, seats, fee), `fee_items`, `seat_status`, `school_facilities`, `school_media`, `school_identifiers`, `field_provenance`, `sources`, `school_affiliations`.

To add (additive, data repo, per project rules a human applies them):
1. `field_provenance`: `observed_at`, `scope_key`, `method`, `review_state` (v2 §6.1, not yet applied) **plus** `valid_from`, `valid_to`, `next_review_on`, and the status vocabulary officially verified / school confirmed / independently corroborated / unverified / conflicting / expired / historical. Retrieved-at, verified-at and valid-for are three different dates.
2. `fee_items`: `head`, `variant`, `mandatory`, `refundable`, `basis`, `evidence_document_id`, `effective_from` (v2 §5.2).
3. `school_staffing`, 4. `school_enrolment`, 5. `school_results`, 6. `school_compliance`, 7. `school_transport` (columns as in the first draft of this section; aggregates only, no named staff).
8. `school_documents` (kind [prospectus, affiliation_letter, mandatory_disclosure, fee_circular, calendar, admission_notice, policy], url or storage path, issued_on, valid_to, academic_year, source). The existing `documents` table is private child paperwork and must not be reused.
9. `school_media`: add `caption`, `alt_text`, `source`, `taken_on` (it already has licence and approval).
10. `schools` additions: `campus_area_sqm`, `boarding_type`, `medium_official`, `rte_participates`, `session_start_month`, `school_timings` (jsonb), `streams` (text[]), `languages` (text[]).
11. `school_facilities.available` is currently `boolean NOT NULL`, so "not confirmed" cannot be stored. Relax it to nullable (yes / no / not confirmed). Checked 15 Oct 2026.
12. Public views (`api.public_*`) for each new table, publishing only accepted rows.
13. Not a table: when ops or the school portal changes a published fact, call on-demand revalidation for that school's page, so a correction appears in seconds, not after the 15-minute cache window.

Nothing here is destructive.

## 5. Structured data and answer-engine mapping

- JSON-LD: `School` subtype by grade span; `identifier` as PropertyValue for UDISE and affiliation number; `amenityFeature` for facilities; `geo`, `address`, `url`, `sameAs` (official site), `dateModified`; `openingHoursSpecification` for the office. Omit `aggregateRating`. Keep phone/email out (controlled-intermediary policy). Do not mark up fees until a school or document confirms them.
- The 20 questions in the parent research map one-to-one to blocks above; the markdown twin (`/index.md`) follows the same block order and carries the snapshot sentence first.
- Dates: every block shows an "as of", and sitemap `lastmod` comes from the newest accepted fact.

### 5.1 SEO / GEO / AEO requirements for the built page (added 15 Oct 2026, after the mockup)

Already live: canonical + hreflang helpers, Open Graph basics, School JSON-LD by grade span, BreadcrumbList, `dateModified` from real data changes, markdown twin, `llms.txt`, indexability gate.

To build with the page:
1. **Snapshot sentence** (header one-liner) is generated from data and reused as meta description, OG description and the first line of the markdown twin. Facts only; no board claim the data does not support.
2. **Structured data per block**, emitted only when the block has accepted rows: fees as `Offer`/price specification only where a school document confirms them (keeps the earlier rule); admission windows per entry class; `dateModified`; `citation` to source documents. Never `aggregateRating`, `Review`, or unverified claims.
3. **FAQ stays visible plain text** generated from data. No FAQPage markup (rich results are largely retired; the text is what answer engines read).
4. **OG / Twitter image** generated per school (name, board, admission status). Alt text on all photos; `school_media.alt_text` is required before a photo renders.
5. **Headings and anchors**: one H1, one H2 per block, stable ids (`#fees`, `#admissions`, ...) so answer engines can deep-link.
6. **Markdown twin parity**: every block, including "Not reported" states and source/date lines, in the same order as the page.
7. **Freshness**: a corrected or newly accepted fact revalidates the page and twin on demand (database change 13). Sitemap `lastmod` = newest accepted fact.
8. **Performance budget**: measure Core Web Vitals on the built page; budget for photos (lazy, sized, modern formats) and the map (click-to-load, no third-party script on first paint).
9. **Not-yet-enriched pages**: blocks without data render a short honest empty state; the page still passes the indexability gate or stays noindex.

### 5.2 Provenance model (owner rule, 15 Oct 2026)

Rule: SchoolOye publishes what school admins provide, so **every fact shown carries provenance**: who supplied it, from what evidence, as of when, who reviewed it, and until when it is valid.

- Columns on every fact table: `source_kind` (school_admin | school_document | public_record | ops_entered | compiled), `submitted_by/at`, `evidence_url` / `evidence_document_id`, `observed_at`, `valid_from/to`, `review_state` (draft | pending_review | published | superseded | rejected | expired), `reviewed_by/at`, `next_review_on`. Migration `20261015150000_fact_provenance_layer.sql`.
- Append-only `fact_revisions` log (trigger-filled, staff-read) so every change is traceable and reversible.
- The page shows a short label per block from these fields: "Provided by the school, 1 Apr 2026", "From CBSE affiliation list, checked 12 Oct 2026", "Compiled from public records, not verified". Only `review_state = published` reaches the public page (via public views, next migration).
- Four-tier chip logic in `src/lib/provenance.ts` extends to read `source_kind` and `review_state`.
- Open decision: do school-admin submissions publish immediately (labelled "Provided by the school") or after SchoolOye review? Both are supported by the state machine; recommendation: immediate for claimed schools with a document attached, review for everything else.

### 5.3 UI/UX review of live competitor and international pages (15 Oct 2026)

Pages read: Edustoke (a Gurugram school page), Careers360 (Gurugram CBSE list), Niche (K-12 list), GreatSchools (profile principles; the school page itself could not be fetched).

What to copy
- Edustoke: itemised fee table; school's own phone shown without a form (our rule: enquiry form, no phone).
- Niche: facts on the card itself (enrolment, student-teacher ratio), removable filter chips, a methodology link beside any grade, "Contact school" as a primary action, reviews labelled by who wrote them (later phase).
- GreatSchools: profile split into programmes/culture and enrolment; a tool that answers "can my child actually attend" (our analogue: commute check and nearby schools); schools register to add their own photos and detail.

What to avoid (seen on live pages)
- Hero fee with no caveat (Edustoke) - we show first-year total and the basis.
- Section tabs that promise content and show nothing (Edustoke Admission, Facilities, Reviews) - our sub-nav lists only blocks that have data.
- Platform's own phone number in the header that parents read as the school's (Edustoke) - never.
- Ratings with no method, tiny samples (Edustoke 4.1 vs parent 3.6 from 9 votes) - no ratings.
- Fees with no source or date and implausible values (Careers360 showed 44 rupees for Class 12) - every fee has basis + date, with range sanity checks at import.
- Filter counts that do not match the list (Careers360) - counts come from the same query as the list.
- Unexplained verification badges (Niche blue check) - our provenance legend sits at the top of the page.
- Unlabelled paid placements between results (Careers360, Niche) - none, and any future one is labelled.
- Contradictory dates and typos (Edustoke "Admision open", last-updated later than copyright year) - generated copy, one date source.

Added to the mockup because of this review: key-facts strip with source under each number, "facts reported on this page: N of M" completeness count, "how to read this page" legend, and a commute check in the location block.

## 6. Build order

1. Spec sign-off (this) → migrations 1–2 (provenance, fee heads) → UI/UX design task.
2. Admissions + fees blocks (highest parent value), then people/results/compliance, then daily life and RTE.
3. Data enrichment feeds each table; blocks render only when they have accepted rows, otherwise a short honest empty state.

## 7. Decisions for the owner

- Confirm: no ratings, no reviews, no composite score.
- Confirm: contact details are never login-gated.
- Confirm: show compliance as "Not reported" when a school has not disclosed, with neutral wording.
- Approve writing the migrations in §4 (a human applies them).

## 8. Review of the second proposal (independent architecture brief, 15 Oct 2026)

Judged on merit, not length. It is a sound generic architecture; most of it matches what we already have. Adopted, adapted or declined:

**Adopted**
- Separate identity, evidence, publication and indexing states (P1, P7, §7.2). We already gate indexing; the quality floor stays parked until real data arrives.
- Versioned, dated claims with retrieved / verified / valid-for dates and richer statuses (conflicting, expired, historical). Folded into change 1 above.
- "Missing is not negative": tri-state facilities, "Not reported" everywhere (change 11).
- Distinguish school-authored text from verified fact: new "From the school" block.
- Documents as first-class (prospectus, affiliation letter, disclosure, fee circular): new block and `school_documents`.
- Media rights, captions and alt text (change 9).
- Cache correctness: material corrections must reach the page quickly (change 13). This is a real gap in our ISR setup.
- Class XI–XII streams and languages offered, as light fields rather than a full subject matrix.
- Success metrics and a repeatable AI-citation query sample (already planned).

**Declined or deferred**
- The 19-table decomposition. Over-built for one founder. We keep what exists and add only tables that feed a visible block. Its `school_claims` means atomic facts; ours means profile-ownership claims and `field_provenance` already holds the atomic facts, so a second table would collide and duplicate.
- Subjects-by-class matrix, named staff lists, clubs, parent-engagement and awards sections: low parent value against collection cost and privacy risk. Awards fit inside "From the school".
- Reviews: later phase, as already decided.
- Separate pages per subject, class or facility: its own thin-page rule forbids them.
- URL `/schools/{slug}`: ours is `/school/{slug}` and is established; renaming gains nothing. One good idea inside it: disambiguate duplicate names with locality (`abc-public-school-narnaul`) rather than a number. Applies to new and duplicate records only, after enrichment; no mass slug change.
- Phone and email in JSON-LD: declined (controlled-intermediary policy).
- Its phase plan: we are already past phase 1 and building the Gurugram reference implementation.

**What the brief lacks that ours adds**: ranking blocks by what parents decide on (admissions and fees first), seats and RTE, safety and compliance as its own block, daily life and transport, an eligibility checker, a questions-to-ask checklist, and generated FAQs.
