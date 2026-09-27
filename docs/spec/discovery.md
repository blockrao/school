# Discovery — Developer Spec

**Status:** draft (home, city, locality, search, compare, shortlist, top-schools guide shipped; rest pending) · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** N-07, N-08, N-13, D-002, D-009, D-022, D-029, D-033, D-040, D-041, D-043, D-044, D-047, D-049, D-050, D-051, D-053, D-080, D-086, D-088, D-089, D-090, D-092, D-096, D-097, D-102, D-108 (see `docs/decisions.md`) · **Guidelines:** `docs/guidelines/seo-geo.md`

## 1. Purpose and scope

Discovery gets a parent from "which schools near me are admitting for Nursery?" to a short list
on a phone, mostly arriving from a forwarded WhatsApp link.

**In scope:**
- home and city picker;
- city pages;
- locality pages (only where there is content);
- board landing pages;
- search (typo-tolerant, Hindi transliteration);
- filters;
- compare (2–4 schools);
- shortlist;
- share cards and WhatsApp share text;
- guides, including attributed third-party rankings;
- map view (P1);
- Ask SchoolOye (P2);
- government schools as Tier C.

**Out of scope:**
- the school page itself (school-page spec);
- city "admissions open / closing soon" behaviour (admissions-tracker spec; routes listed here
  only);
- fee comparison tables and rankings on school pages or in search order (D-009, D-088);
- parent reviews (P2, D-009);
- sponsored cards before 1 Dec (D-089).

## 2. Current state (verified against the repo on 27 Sep 2026)

All reads go through `src/lib/db/public-adapter.ts` (`api.*` views only, N-10).

**Home** `src/app/[locale]/page.tsx` (screen map: designed+built)
- `/` redirects to `/en` (`src/app/page.tsx`).
- Home renders the city from the cookie via `getSelectedCityArea()`, falling back to Jaipur.
- It shows a search form (to `/schools?q=`), "Admissions open now", and tools.
- The city picker is a header control (`src/components/shell/city-picker.tsx`). The home page
  is not a picker.

**City** `src/app/[locale]/[city]/page.tsx`
- Resolves city → town → legacy-district redirect.
- Board / grade / admissions-open filters with `noindex` on any filter (N-08).
- "Browse by area" links to locality pages, plus a lazy map.
- Scoped by `district_id`, not `city_id` (Gurugram needs `city_id`, D-080).

**Locality** `src/app/[locale]/[city]/[entitySlug]/page.tsx` (`resolve.ts` tries the locality
first, then `[slug]-[school_code]`)
- Every locality renders **indexable** with a canonical.
- `sitemap-jaipur.xml` includes only localities with ≥ 3 schools (`listPublicLocalitiesByCity(…, 3)`).

**Search** `src/app/[locale]/schools/page.tsx`
- `listPublicSchoolsByDistrict`: `ilike '%q%'` on `name_en` only. No typo tolerance, no Hindi,
  no locality match.
- The grade filter is `max_class = x`, which is wrong: it should mean "teaches class x".
- List/Map toggle, compare tray (client island), `noindex`.

**Compare** `src/app/[locale]/compare/page.tsx?ids=` (≤ 4, `noindex`)
- Rows: board, grades, management, gender, medium, fee range (**hard-coded "Not yet
  published"**), admission deadline, website.

**Shortlist** `src/app/[locale]/my/shortlist/*` with `SaveButton`
- **Requires sign-in.** An anonymous Save redirects to `/sign-in`.

**Share**
- The school page uses `ShareButton` (native share or copy link).
- `ShareSheet` (`src/components/ui/share-sheet.tsx`, a `wa.me` link with UTM) exists but is
  used only in `/dev/components`.
- The school OG image exists (`[entitySlug]/opengraph-image.tsx`). There are no city OG images.

**Guides**
- `src/app/[locale]/guides/page.tsx` lists 3 topics as non-link cards with no articles, and
  does not link the rankings guide.
- `guides/top-schools-in-jaipur/page.tsx` reads `api.public_school_rankings`
  (`db/views/090_public_school_rankings.sql`).
  - It says only "based on independent rankings": **no publisher name or year**, which D-088
    requires.
  - It hard-codes `SCHOOL_BLURBS` per school id with unsourced facts (e.g. "roots going back to
    1941").
  - The view file also contains a `GRANT`, which CLAUDE.md reserves for `supabase/migrations/`.

**Map**
- `AreaMap`/`AreaMapLazy` (MapLibre, OpenFreeMap tiles) draw locality/pincode-precision circles
  for the current results page only.
- No distance from a pin or the device location.

**Not built:**
- board landing pages;
- `/[city]/admissions` (screen-map row 4, pending);
- Ask SchoolOye;
- event tracking (the `events` table has anon INSERT grants but no app code writes it);
- sponsored cards (`featured_placements` table only).

## 3. Requirements

### Home and city picker
1. **P0 — City picker first (D-043).** `/[locale]` without a city cookie leads with the picker.
   - Launched cities only: Jaipur now; Gurugram once its pilot pages pass the gate, target 1 Nov
     (D-080).
   - Choosing sets the cookie and links to `/[locale]/[city]`.
   - No geo-IP redirect.
   - With a cookie, home shows that city's "Admissions open this week" (tracker spec), search,
     and alert and age-checker CTAs.
   - Delhi appears only as the nursery hub content when it ships.

### City, board and locality pages
2. **P0 — City page `/[locale]/[city]`.** Indexable. One `<h1>`: "Schools in Jaipur".
   - Counts by status. Links to `/[city]/admissions` (open + closing soon) and to each board page.
   - Locality is a **filter** on this page (`?locality=`), per D-041.
   - Scope by `city_id` once assigned.
3. **P1 — Board landing `/[locale]/[city]/board/[board]`**, where `[board]` is the lowercased
   `boards.code`.
   - A static `board` folder beside `[entitySlug]` (a static segment wins).
   - Indexable (D-053) only when the city has ≥ 10 published schools on that board. Otherwise
     it 404s and is not linked.
   - In the city sitemap route (D-044).
4. **P1 — Locality pages (D-097).** Rendered and linked for any locality with published schools.
   - Indexable only with ≥ 8 schools at L2+ and ≥ 2 at L3 (D-097, resolving D-041's "where
     content justifies" against today's all-indexable behaviour). Below that threshold, the page
     still renders and is linked from the city page, but is **`noindex, follow`** and excluded
     from `sitemap-jaipur.xml`.
   - Nearby localities come from `locality_neighbors` (D-033).

### Search and filters
5. **P0 — Search (B1).** Search is city-scoped and matches:
   - school name (English and Hindi);
   - known aliases and abbreviations ("DPS", "KV", "St.", "Sr. Sec.");
   - locality name.

   Behaviour:
   - It is typo-tolerant through trigram similarity (≥ 0.3), ranked exact → prefix → similarity.
   - Devanagari input and Hinglish ("vidyalaya", "vidhyalay") match through a stored,
     transliterated search key. The key is generated in the data repo from `name_en`, `name_hi`
     and aliases.
   - Order is relevance only, never rankings or sponsorship (D-088, D-089).
   - Empty state: "No school matching 'xyz' in Jaipur. Check the spelling, or search by area."
     plus "Report a missing school" (the update-report intake).
6. **P0 — Filters (B2).**
   - Built: board, admissions open.
   - Fix: class, which becomes "teaches class x" (`min_class ≤ x ≤ max_class` by
     `class_levels.sort_order`).
   - Add management type, gender, locality, and form mode (online/offline, from the current
     cycle).
   - P1: distance (after the map).
   - Filters show only values present in the city (the existing pattern).
   - Every filtered URL is `noindex, follow` and excluded from sitemaps (N-08).
   - Filter state lives in `searchParams` via `next/form`, with no client state.

### Compare, shortlist, share
7. **P1 — Compare (B7).**
   - 2–4 schools via `?ids=` (a shareable link). `noindex`. Factual rows only.
   - Add admission status for the selected class with its source line, and first-year cost with
     its basis label once fees publish (entity spec §9.4). Until then keep "Not yet published".
   - No "winner", scores or highlighting of a "better" value.
8. **P0 — Shortlist (B8).**
   - An anonymous Save stores school ids in a signed, httpOnly cookie (≤ 20 ids, no client JS).
   - It is merged into `shortlists` on sign-in.
   - `/my/shortlist` shows status and the next deadline per school.
   - Account shortlist and child link stay as built.
9. **P0 — Share (B9).**
   - Replace `ShareButton` with `ShareSheet` on school and city pages. WhatsApp is the first
     option; the link carries `utm_source=whatsapp&utm_medium=share` (J5).
   - Share text is generated from published facts only:
     "{School}, {city}: {class} {session} forms close {date}. Checked {n} days ago. {url}".
     Stale or unknown facts drop that clause; nothing is invented.
   - City OG image via `next/og`.
   - Log a `school_shared` event.

### Guides and rankings
10. **P1 — Guides (J3).**
    - The guides index links only articles that exist. Drop the non-link placeholder cards.
    - Each guide is a server-rendered page with one `<h1>`, sources listed, and hreflang only
      when a Hindi version exists (D-086).
11. **P0 — Rankings guide (D-088, D-029).**
    - Every category heading names the publisher and year ("Source: {publisher}, {year}") with
      a link.
    - The view exposes `publisher`, `year` and `source_url`.
    - Remove the hard-coded blurbs, or replace them with facts from `api.public_schools` and
      their labels (D-022, D-047).
    - Rankings never appear on school pages, cards or search order.
    - Title: "Top schools in Jaipur: what the published rankings say".

### Map and later items
12. **P1 — Map (B6).** Distance from a dropped pin or the device location (on tap, never on
    load). Always labelled "approx." because Jaipur geocodes are locality/pincode precision.
    Lazy client island, outside the ≤ 60 KB page budget (D-051).
13. **P2 — Ask SchoolOye (B10).**
    - A natural-language query is parsed into filters (city, class, board, area, status) and
      answered only with rows from `api.*` views, each with its source line.
    - When the data doesn't answer: "Not yet published".
    - No free-text answers about quality (D-047, N-13).
14. **P0 — Government schools (D-092).**
    - Listed and searchable as Tier C, with a filter chip "Government".
    - School pages are `noindex` until they have a verified admissions record (D-090).
    - Excluded from "admissions open" lists until they have one.

## 4. Data

**Reads:**
- `api.public_schools`, `api.public_school_boards`, `api.public_school_admissions`,
  `api.public_localities`, `api.public_locality_neighbors`, `api.public_cities`,
  `api.public_boards`, `api.public_school_rankings`;
- `shortlists` (own rows, RLS);
- insert into `events`.

**Additive DDL** (data session, D-091):

```sql
create extension if not exists pg_trgm;
alter table schools add column search_key text;          -- lower(unaccent) name_en + aliases + transliterated name_hi, built by data repo
create index schools_search_key_trgm on schools using gin (search_key gin_trgm_ops);
alter table school_rankings add column publisher text, add column source_url text;   -- if not already present
```

**This repo:**
- `api.public_schools` gains `search_key`.
- `api.search_schools(p_q text, p_city_id int, p_limit int)`: a `STABLE`, `SECURITY INVOKER`
  SQL function over `api.public_schools` returning ids and scores.
  - It is needed because PostgREST can't express `similarity()` on a view.
  - Approved as a read-only `api` schema function under D-102 (amends N-10 for exactly this
    case — typo-tolerant search a view can't serve), covered by `verify:views` like a view.
- Move the `GRANT` out of `090_public_school_rankings.sql` into a migration.

## 5. Rules

- Trust: no paid ranking, no "best" badges, sponsored always labelled (N-13, D-089).
  Third-party rankings only on editorial guides, attributed (D-088).
- Unknown values say "Not yet published" (D-049). Status colours always carry text; margin red
  only for deadlines within 7 days (D-050).
- Privacy: the anonymous shortlist cookie holds school ids only. Events carry no child data.
- SEO: canonical URLs, `BreadcrumbList` (city → locality → school, D-041), sitemaps and
  crawler rules are in `docs/guidelines/seo-geo.md`. Only city, city+board and city
  admissions pages are indexable landing pages (D-053, which D-108 scopes to listing/filter/landing
  pages; entity pages follow their own gates).

## 6. Acceptance criteria

- [ ] `/en` with no cookie shows the city picker first; there is no geo-IP redirect.
- [ ] Searching "dps jaipr", "महावीर" and "vidhyalaya" returns the expected Jaipur schools.
      Results are never ordered by ranking or sponsorship.
- [ ] Class filter "Class 4" returns schools teaching Class 4, not only those ending there.
- [ ] Every filtered URL has `robots: noindex, follow` and is absent from sitemaps.
- [ ] `/en/jaipur/board/cbse` renders and is in `sitemap-jaipur.xml`; a board with < 10
      schools 404s.
- [ ] A locality below the D-097 threshold (< 8 schools at L2+ or < 2 at L3) still renders and is
      linked from the city page, but is `noindex, follow` and absent from `sitemap-jaipur.xml`.
- [ ] An anonymous Save persists across pages and merges into `shortlists` after sign-in.
- [ ] The WhatsApp share opens `wa.me` with the generated text and a UTM-tagged URL.
- [ ] The rankings guide shows publisher and year on every category, and there are no
      unsourced blurbs.
- [ ] The school page's app JS stays ≤ 60 KB gzip (`pnpm bundle-check`).

## 7. Deferred and open

- **Deferred:** Ask SchoolOye (P2); map distance (P1); sponsored cards from 1 Dec (D-089);
  reviews (P2); Hindi city pages by 15 Nov (D-086).
- **Settled since 27 Sep:**
  - Locality page indexability: settled by D-097 (see req. 4). Indexable only at ≥ 8 schools at
    L2+ and ≥ 2 at L3; otherwise rendered and linked but `noindex`.
  - Whether search can be an `api.*` SQL function: settled by D-102. Yes, as a read-only,
    security-invoker function with a Zod contract (see §4).
  - City admissions route: settled by D-096. It is `/[locale]/[city]/admissions`; filtered
    variants are `noindex`.
