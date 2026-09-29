# SEO / GEO guideline

**Applies to:** every public, indexable page. **Updated:** 27 Sep 2026
**Decisions:** N-07, N-08, D-040–D-053, D-081, D-086, D-088, D-090, D-094, D-096, D-097, D-101, D-108, D-109
Feature-specific detail lives in the feature specs (`docs/spec/school-entity-page.md` §11 is the
fullest example). This file holds the rules that apply everywhere.

## 1. Principles

1. **We rank by being the most accurate, current source, not by SEO tricks.** "Official" is not a
   ranking signal; links from schools' own sites and dated, specific facts are.
2. **Nothing hand-written for search engines.** No keyword paragraphs, fake FAQs, invented schema
   or "GEO copy" (D-047). The snapshot sentence and FAQ exist for readers.
3. **Index only pages with unique, current facts** (D-090). Thin or templated pages are rendered
   for people but `noindex` — scaled-content abuse is the main risk for a 10k-school directory.
4. **Generated, never hand-authored:** titles, descriptions, JSON-LD, sitemaps and `index.md`
   all come from `api.*` views (N-07).

## 2. URLs

**Frozen spec: `docs/spec/urls-and-routing.md` (D-121).** It governs every URL pattern, slug rule,
redirect and lifecycle state. Summary:

| Page | URL |
|---|---|
| School (canonical entity) | `/school/{slug}` |
| School admissions / fees | `/school/{slug}/admissions`, `/fees`; archives `/admissions/{yyyy-yy}`, `/fees/{yyyy-yy}` |
| Exam | `/exams/{slug}` |
| Teacher | `/teacher/{first-middle-last}-{teacher_code}` (issued at registration, D-125) |
| Discovery | `/schools`, `/schools/{state}`, `/schools/{state}/{city}`, `/schools/{state}/{city}/{locality}`; city-states (Delhi) at `/schools/{state}[/{locality}]` (D-126) |
| Other languages | `/{lang}/…` only when that page is translated; otherwise 404 |

- Filters are query parameters, `noindex`; pagination is self-canonical and indexable.
- Every legacy URL 301s to its canonical form in one hop. No new pattern without review.

## 3. Metadata (`generateMetadata`)

- One `<h1>` per page. Canonical is absolute and self-referencing, with no `/en` prefix (D-121).
- Title patterns (from view data only; drop any clause whose data is missing):
  - School: `{Name}, {Locality/City}: Admissions, Facts & Contact · SchoolOye`. **Revised 29 Sep
    2026** — the previous pattern here (`Admission {session}, Fees & Contact`) promised a specific
    admission session and a "Fees" clause that most schools don't have data for; that's the exact
    "don't claim information merely because the keyword is valuable" violation this doc's own §1
    warns against, and `buildSchoolMetaDescription` (Increment 11, `src/lib/school-metadata.ts`)
    had already corrected the equivalent problem in the meta description for the same reason —
    the title just hadn't caught up. Names real sections every school page actually has (true
    regardless of population state), never a specific fact value or a feature (Fees) with no data
    pipeline behind it at all. Do not re-add a session/date clause here without first giving every
    school a real, current admission cycle to show — see `selectPrimaryAdmission` for what "real"
    means. `·` throughout, not `—`.
  - School admissions: `{Name} Admission {session}: Dates, Age Criteria, Documents · SchoolOye`
  - School fees: `{Name} Fee Structure {session} (Class-wise) · SchoolOye` — **unverified 29 Sep
    2026**: fees has no data pipeline at all (Increment 11 finding); confirm this route/page
    actually exists and is fed real data before trusting this line.
  - City admissions: `{City} School Admissions {session}: Open Now & Closing Soon · SchoolOye`
  - Exam: `{Exam} {session}: Dates, Eligibility, Fees · SchoolOye`
- Description: the page's snapshot sentence, ≤155 characters.
- OG image via `next/og`, showing the name and current admission status.
- **hreflang:** only on pages with a translation: one entry per available language plus
  `x-default` → English (D-121). Untranslated pages emit none.

## 4. Structured data

Updated 29 Sep 2026 (Identity & Search Presence Foundation v1 + Canonical Page Freshness & GEO
Alignment v1) to match what's actually implemented — this section had drifted from the code.

- **School pages:** `School` subtype (`ElementarySchool` / `HighSchool` / `School`), `@id` = the
  canonical URL + `#school` fragment (a `WebPage` node owns the bare canonical URL itself, with
  `mainEntity` pointing at this `@id` — not one flat node standing in for the page). `name`,
  `alternateName`, `description`, `address` (`PostalAddress`), `geo`, `foundingDate`, `areaServed`,
  `memberOf` (board), `additionalProperty` (grade range — no first-class schema.org property fits,
  so this is the documented escape hatch for a real, displayed fact that doesn't map to one),
  `subjectOf` (this school's own News/Events/Jobs, each of which carries its own
  `NewsArticle`/`Event`/`JobPosting` JSON-LD on its own canonical page and references this `@id`
  back — one connected graph, not nodes that only coincide on a name string).
  **No `inLanguage`** (added, then removed the same day, 29 Sep 2026 — correction from Prav):
  `inLanguage` describes the language of a `CreativeWork`'s own content (the language SchoolOye
  renders the page in), not a fact about the school; it also isn't even in `inLanguage`'s
  schema.org domain for a `School`/`EducationalOrganization` node. Medium of instruction stays a
  normal, sourced page fact (School facts section, eligible for the same evidence mechanism as any
  other field) — it just isn't a `School`-entity structured-data property, and there is no clean
  one to borrow. Per the locked principle (structured data is a truthful projection, not a forced
  mapping of every UI field into schema.org), omission is correct here — do not reintroduce this.
  `url` = this page's own canonical URL (the school's own website goes in `sameAs`, not `url`).
  **No `telephone`** (SDP-04): SchoolOye is a controlled intermediary, not a directory — contact
  routes through the enquiry form, so JSON-LD stays consistent with what the visible page shows.
  **No `employee`** (D-045) even though the page lists teachers.
  `identifier`: board affiliation no. **and** UDISE+ code, one `PropertyValue` each when known (UDISE+
  covers most of the corpus; board affiliation only ~4% — this is not "board-only" any more, see §0
  provenance decision, 29 Sep 2026).
  `sameAs`: only URLs genuinely established as the same school's own official record — website, and
  the SARAS CBSE affiliation detail page (deterministic by affiliation no., CBSE-board schools only,
  pattern verified across ~19 real fetches). **Not yet added:** UDISE+'s own KYS record page —
  only one live example is confirmed and the URL's trailing segment isn't verified to generalize;
  add once confirmed across a real sample, never guessed. Maps/socials: not sourced yet, add the
  same way once a link is genuinely verified as this school's own.
  `WebPage` node carries `dateModified` — see §6a; **never** the build/request time.
- **Admission cycles:** kept in the admissions domain model (session, classes, status, dates,
  application URL, source, checked date) and rendered as plain page content — **deliberately not**
  emitted as `Event` schema (locked 29 Sep 2026, reversing an earlier draft of this doc). An
  admission *window* ("Nursery admissions open until 10 Dec") is not an event in the schema.org
  sense; manufacturing one to gain GEO surface area is exactly the "invented schema" §1 rules out.
  A genuinely dated, single-occurrence happening a school announces — an admission test, open
  house, orientation, PTM, annual day — is a real `Event` and already gets one on its own `/events`
  page when published there; that's the correct home for it, not a duplicate on the school page.
- **Exam pages:** `Event` per published milestone window + `BreadcrumbList`; organiser = the
  conducting body.
- **Never:** `AggregateRating`, `Review`, `employee` (D-045). **`FAQPage`: removed entirely**
  (SDP-03/HP-03, 29 Sep 2026) — the ≥3-real-facts conditional this line used to describe was
  superseded once every FAQ question turned out to just restate a fact already structured
  elsewhere (board/grades/location/admission status), with no matching visible on-page Q&A; Google
  also restricted FAQ rich results to gov/health sites in 2023, removing the remaining upside.
  Validate JSON-LD in CI.
- Brand in all markup: **SchoolOye** (D-081).

## 5. Indexing, sitemaps, crawlers

- **Gate (MVP, D-114):** a school page is indexable at L2 — name, address with locality/pincode, board,
  phone or website, each sourced. *Earlier rule, superseded:* indexable only at L3 (D-090, coordinates at pincode precision or
  better, D-109); the page emits
  `<meta name="robots" content="noindex,follow">` otherwise. Government schools stay `noindex`
  until L3 (D-092).
- **Indexing:** production is always open to crawlers; only Vercel Preview is noindex (D-120).
  (D-094). While off, `robots.ts` disallows everything.
- **Sitemaps:** route handlers per launched city (`sitemap-{city}.xml`) plus `sitemap-site.xml`,
  indexed by `sitemap.xml`. Only indexable URLs. `lastModified` = latest displayed-fact
  `verified_at`/change time, never the build time (D-044).
  **Known gap, 29 Sep 2026:** the school entity page's own `dateModified` (§6a) is now the wider,
  correct freshness projection — `max(verifiedAt, visible per-field evidence, admission updates)` —
  but `sitemap.ts`'s `lastmod` still uses `school.last_verified_at` alone (real only for a formal
  verification event, null for most schools), computed once per city across every school in the
  district rather than per school. Bringing the sitemap in line needs a heavier per-school join at
  sitemap-generation scale (thousands of schools per city) that wasn't done in this pass — until
  then the sitemap understates freshness for schools with recent evidence/admission changes but no
  formal verification event.
- **Freshness pings:** IndexNow notifies participating search engines (chiefly Bing) of URL changes
  on revalidation — it is a distribution optimisation, not a universal AI/GEO freshness mechanism,
  and nothing in this codebase implements it yet (confirmed 29 Sep 2026). Lower priority than
  correct canonical URLs, sitemaps, indexability and structured data above; add only if it's
  actually shown to move something. Google relies on sitemaps regardless.
- **robots.ts:** allow search engines and AI crawlers on public routes; disallow `/my`, `/portal`,
  `/ops`, `/api`, `/dev`. Target AI list: GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
  OAI-SearchBot, ChatGPT-User, Perplexity-User (today: the first four).

## 6. AI readability (GEO done honestly)

### 6a. Two clocks, never collapsed into one (locked 29 Sep 2026)

- **Trust clock — `verifiedAt`/`school.last_verified_at`:** "did SchoolOye actually verify this
  fact." Stays null until a real verification event happens; never backfilled or inferred from a
  provenance timestamp (locked rule, unchanged).
- **Freshness clock — `dateModified`:** "did the published page change." A different claim — a page
  can be freshly modified (new UDISE+/SARAS evidence landed, an admission cycle was updated, a new
  News/Event/Job post appeared) without every fact on it being freshly *verified*. Computed as
  `max(verifiedAt, every field the page actually renders a SourceLine for, every admission-cycle
  change shown under "Recent admission updates", every News/Event/Job actually rendered in "What's
  happening")` — the evidence-field part restricted to fields the page visibly cites, never every
  row in `api.public_field_evidence` for that school, most of which cover facts this page doesn't
  display at all and would inflate freshness for something a visitor or crawler can't see. The
  News/Events/Jobs part uses each domain's own "this appeared" timestamp — `published_at` (news),
  `created_at` (jobs, events) — never a scheduled/future date like an event's `starts_at`, which
  would make `dateModified` show a future date. Omitted (never a fabricated build/request-time
  fallback) when nothing dated is known yet.
- These two must never be conflated in structured data, in copy, or in a future dashboard: showing
  `dateModified` next to language that implies verification (or vice versa) misstates which of the
  two claims is actually true.

- Key facts appear as **plain server-rendered text near the top**, with year and session:
  "Nursery admissions for 2027-28 are open until 10 Dec 2026 (confirmed by the school on 2 Oct)."
- Every school page has an `index.md` twin with the snapshot sentence, admissions table, fees with
  basis labels, and sources with dates. `public/llms.txt` describes the site (low priority).
- AI answer engines favour fresh, dated, specific facts and query-shaped titles. That is what the
  rules above produce; nothing extra is needed.

## 7. Internal linking and authority

- Entity pages are the link target for city, locality, admissions hub, compare, similar-schools,
  other-campus and notice pages. Anchor text uses "{School} admission {session}" / "{School} fees"
  where natural.
- The strongest authority signal is the school's own website linking to its SchoolOye page: the
  widget writes a crawlable `<a>` into the host page (D-063). Push it in every claim.
- JaipurCircle links to SchoolOye canonically and never duplicates school pages (D-002).
- Third-party rankings appear only on editorial guides, attributed to the publisher (D-088).
