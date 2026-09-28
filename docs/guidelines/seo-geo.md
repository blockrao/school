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

| Page | URL | Notes |
|---|---|---|
| Home / city picker | `/[locale]` | No geo-IP redirect (D-043) |
| City | `/[locale]/[city]` | |
| City admissions | `/[locale]/[city]/admissions` | Named landing page (D-053, D-096). Entity and service pages follow their own gates (D-108) |
| Locality | `/[locale]/[city]/[locality]` | Indexable only with ≥8 L2+ and ≥2 L3 schools (D-097) |
| School | `/[locale]/[city]/[slug]-[school_code]` | Resolved by `school_code`; wrong slug → 308 (D-040) |
| School admissions / fees | `…/admissions`, `…/fees`; archive `…/admissions/{yyyy-yy}` | Evergreen (D-042) |
| Exam | `/[locale]/exams/[slug]` | No city (D-012, D-101) |
| Markdown twin | `…/index.md` | Follows the parent page's index state |

- District never appears in a URL, breadcrumb or label (D-041). No `[state]` segment.
- Filter and sort parameters (`?board=`, `?class=`) are never canonical: `rel=canonical` to the
  unfiltered page and `noindex` (N-08, D-053).
- `/my`, `/portal`, `/ops`, `/api`, `/dev`, `/embed` are `noindex`.

## 3. Metadata (`generateMetadata`)

- One `<h1>` per page. Canonical is self-referencing and includes the locale prefix.
- Title patterns (from view data only; drop any clause whose data is missing):
  - School: `{Name}, {Campus/Locality}: Admission {session}, Fees & Contact · SchoolOye`
    (drop "Admission {session}" when there is no current-session cycle).
  - School admissions: `{Name} Admission {session}: Dates, Age Criteria, Documents · SchoolOye`
  - School fees: `{Name} Fee Structure {session} (Class-wise) · SchoolOye`
  - City admissions: `{City} School Admissions {session}: Open Now & Closing Soon · SchoolOye`
  - Exam: `{Exam} {session}: Dates, Eligibility, Fees · SchoolOye`
- Description: the page's snapshot sentence, ≤155 characters.
- OG image via `next/og`, showing the name and current admission status.
- **hreflang:** emit `hi-IN` only when that page's Hindi content exists (`hi_ready`, D-086).
  Otherwise emit `en-IN` only. Never point hreflang at an untranslated duplicate.

## 4. Structured data

- **School pages:** `School` subtype (`ElementarySchool` / `HighSchool` / `School`) with `@id`
  `{canonical}#school`, `name`, `alternateName`, `address` (`PostalAddress`), `geo`, `telephone`,
  `url` = the school's own website, `foundingDate`, `identifier` (`PropertyValue`: "SchoolOye School
  ID" + board affiliation numbers — never the UDISE code, D-082), `sameAs` (verified official
  links: website, Maps, board record, socials), `parentOrganization` (brand), `event` (admission
  windows, tests), `BreadcrumbList`, and a `WebPage` node with `dateModified`.
- **Exam pages:** `Event` per published milestone window + `BreadcrumbList`; organiser = the
  conducting body.
- **Never:** `AggregateRating`, `Review`, `employee` (D-045); `FAQPage` only when ≥3 real facts
  support it, and never expanded for SEO (D-046). Validate JSON-LD in CI.
- Brand in all markup: **SchoolOye** (D-081).

## 5. Indexing, sitemaps, crawlers

- **Gate (MVP, D-114):** a school page is indexable at L2 — name, address with locality/pincode, board,
  phone or website, each sourced. *Earlier rule, superseded:* indexable only at L3 (D-090, coordinates at pincode precision or
  better, D-109); the page emits
  `<meta name="robots" content="noindex,follow">` otherwise. Government schools stay `noindex`
  until L3 (D-092).
- **Launch switch:** `SITE_INDEXABLE` flips once the Jaipur pilot list is at L2 and CI is green (D-114).
  *Superseded:* ≥50 Jaipur schools at L3
  (D-094). While off, `robots.ts` disallows everything.
- **Sitemaps:** route handlers per launched city (`sitemap-{city}.xml`) plus `sitemap-site.xml`,
  indexed by `sitemap.xml`. Only indexable URLs. `lastModified` = latest displayed-fact
  `verified_at`/change time, never the build time (D-044).
- **Freshness pings:** IndexNow on every revalidation (Bing, and through it ChatGPT search);
  Google relies on sitemaps.
- **robots.ts:** allow search engines and AI crawlers on public routes; disallow `/my`, `/portal`,
  `/ops`, `/api`, `/dev`. Target AI list: GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
  OAI-SearchBot, ChatGPT-User, Perplexity-User (today: the first four).

## 6. AI readability (GEO done honestly)

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
