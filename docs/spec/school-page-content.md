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
| 3 | Admissions (per entry class) | Is it open? When? Who can apply? | window, age cut-off + reference date, documents, selection method (test/lottery/interview), seats status, application fee, official form link, alert CTA | table exists, empty |
| 4 | Eligibility check | Can my child apply? | DOB entered in browser, not stored | exists |
| 5 | Fees | What will it really cost? | itemised heads per class, one-time vs annual, basis label (school/official/parent), year-on-year change, what is not included | table exists, empty |
| 6 | Academics and results | How do students do? | curriculum/streams, last 3 years Class X/XII appeared, passed, % (with cohort size) | missing |
| 7 | People | Who teaches? | principal, teacher counts by category, student-teacher ratio, qualified share, special educator, counsellor | missing |
| 8 | Safety and compliance | Is it legitimate and safe? | affiliation status, fire / building / sanitation certificate validity, society registration, CCTV, grievance and POCSO contacts, RTE recognition, state fee-filing status | missing |
| 9 | Campus and facilities | What is on site? | campus area, classrooms, labs, library, sports, toilets, internet, accessibility, boarding | table exists, empty |
| 10 | Daily life | How does a day work? | timings, session start, weekly calendar, transport (offered, coverage, fee band), co-curriculars | missing |
| 11 | RTE and inclusion | Is there a free-seat route and support? | RTE 25% participation, seats, how to apply, special-needs support | missing |
| 12 | Location and commute | How do we get there? | map, address, nearby landmarks, nearby schools (with status) | partial |
| 13 | Contact and enquiry | How do I reach them? | phone, email, website, hours — never login-gated; enquiry routed through SchoolOye | exists |
| 14 | Updates, news, events, jobs | What is new? | school posts | exists |
| 15 | Questions to ask the school | What should I check on a visit? | generated checklist from missing/uncertain fields | new |
| 16 | FAQ | Direct answers | generated from the data, plain text, no FAQPage markup | removed, rebuild |
| 17 | Sources and verification | Can I trust this? | per-field source, date, evidence link, report-an-update | partial |

Deliberately absent: star ratings, letter grades, composite scores, paid ranking, unmoderated reviews. Parent input is limited to labelled fee reports with evidence.

Block order puts decisions before reassurance: admissions and fees come before academics, because they are what a visitor came to check.

## 4. Database changes

Existing and reusable: `admission_cycles` (class, dates, dob range, docs, seats, fee), `fee_items`, `seat_status`, `school_facilities`, `school_media`, `school_identifiers`, `field_provenance`, `sources`, `school_affiliations`.

To add (additive, data repo, per project rules a human applies them):
1. `field_provenance`: `observed_at`, `scope_key`, `method`, `review_state` (already designed in v2 §6.1; not yet applied).
2. `fee_items`: `head`, `variant`, `mandatory`, `refundable`, `basis`, `evidence_document_id`, `effective_from` (v2 §5.2).
3. `school_staffing` (school, academic_year, teachers_total, pgt, tgt, prt, qualified_share, student_teacher_ratio, special_educators, counsellors, source, verification).
4. `school_enrolment` (school, academic_year, stage/class, boys, girls, total, cwsn).
5. `school_results` (school, academic_year, exam [x|xii], appeared, passed, pass_pct, source, verification).
6. `school_compliance` (school, kind [fire, building, sanitation, society, state_noc, rte, cctv, pocso, grievance, fee_filing], status, valid_from, valid_to, document_url, verification).
7. `school_transport` (school, offered, coverage_areas, fee_band, source, verification).
8. `schools` additions: `campus_area_sqm`, `boarding_type` (day / day_boarding / boarding), `medium_official`, `rte_participates`, `session_start_month`, `school_timings` (jsonb, structured).
9. A schema-parity guard: public views (`api.public_*`) for each new table, publishing only accepted rows.

Nothing here is destructive.

## 5. Structured data and answer-engine mapping

- JSON-LD: `School` subtype by grade span; `identifier` as PropertyValue for UDISE and affiliation number; `amenityFeature` for facilities; `geo`, `address`, `url`, `sameAs` (official site), `dateModified`; `openingHoursSpecification` for the office. Omit `aggregateRating`. Keep phone/email out (controlled-intermediary policy). Do not mark up fees until a school or document confirms them.
- The 20 questions in the parent research map one-to-one to blocks above; the markdown twin (`/index.md`) follows the same block order and carries the snapshot sentence first.
- Dates: every block shows an "as of", and sitemap `lastmod` comes from the newest accepted fact.

## 6. Build order

1. Spec sign-off (this) → migrations 1–2 (provenance, fee heads) → UI/UX design task.
2. Admissions + fees blocks (highest parent value), then people/results/compliance, then daily life and RTE.
3. Data enrichment feeds each table; blocks render only when they have accepted rows, otherwise a short honest empty state.

## 7. Decisions for the owner

- Confirm: no ratings, no reviews, no composite score.
- Confirm: contact details are never login-gated.
- Confirm: show compliance as "Not reported" when a school has not disclosed, with neutral wording.
- Approve writing the migrations in §4 (a human applies them).
