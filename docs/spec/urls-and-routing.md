# SchoolOye — Canonical URL & Routing Architecture v1 (FROZEN)

**Adopted:** 28 Sep 2026 (D-121) · **Owner:** Prav · **Status:** frozen — changes only through an architecture review and a new register entry.
Supersedes the URL parts of D-012, D-040, D-041, D-042, D-043 and D-096.

**Principle.** This is an entity architecture with a URL projection. The database ID is the true identity; the public slug is a permanent public locator. They are never confused or substituted. Do not add URL patterns or SEO routes without an architecture review.

## 1. URL scheme

```
ENTITIES
/school/{slug}                              campus — canonical factual entity
/teacher/{name}-{teacher_code}              teacher (see §5; D-125)
/exams/{slug}                               exam (already live; keep as-is)

CAMPUS VIEWS
/school/{slug}/admissions                   current cycle
/school/{slug}/fees                         current cycle
/school/{slug}/admissions/{yyyy-yy}         archived cycles only
/school/{slug}/fees/{yyyy-yy}               archived cycles only

LANGUAGE
/{lang}/school/{slug}                       only when translated (applies to every root above and to discovery)

DISCOVERY
/schools
/schools/{state}
/schools/{state}/{city}
/schools/{state}/{city}/{locality}          enabled when locality data exists
/schools/{city-state}[/{locality}]          city-states such as Delhi (D-126)
/schools/{state}/{city}/{facet}             gated (§7)
```

## 2. Identity

- Every entity (campus, teacher, exam, state, city, locality) has an immutable integer primary key. It is never exposed in URLs. All relationships reference IDs; slugs are never foreign keys.
- Each entity stores `id`, `slug`, `display_name`, `aliases[]`.
- **Campus** owns all school facts: address, board, classes, fees, admissions, timings, facilities, transport, contact.
- **State / city / locality** are discovery entities with IDs. They own no campus facts.

## 3. Slugs

- Lowercase `[a-z0-9-]`, hyphen-separated, no leading/trailing hyphen, ≤ 60 chars.
- Unique within its root (`/school/`, `/teacher/`, `/exams/`, and within the discovery hierarchy). The same slug may exist under different roots.
- **Entity slugs are minted once and immutable.** A rename updates `display_name` and adds an alias; the URL never changes. Uneven results (`dps-gurugram` beside `dps-gurugram-sector-67`) are accepted and never "improved."
- **Discovery slugs (state, city, locality) are the one exception:** they may change on rename, with a permanent 301, because they are navigation, not locators.
- Collision resolution at mint time, in order: bare name → +locality → +city → numeric suffix (`-2`, `-3`). First created keeps the shortest form.
- Minting rejects reserved words per root. The list lives in code, not prose, and includes at minimum every route segment (`admissions`, `fees`, `new`, `search`, `compare`), every language code, and every state/city slug.

## 4. Campus views

- A view is a sub-resource of exactly one campus and introduces no facts belonging to another entity.
- Routes are reserved from day one. A view has three states, and every request resolves to exactly one:
  - **Never indexed, below threshold** → 301 to the parent's section anchor.
  - **Above threshold** → 200, self-canonical, indexable.
  - **Previously indexed, now degraded** → 200, `noindex`, limited-state UI (hysteresis; a single missing field never destroys an established URL).
- Current-cycle URLs carry no year; the cycle is stated in-page. Archive URLs are created only when a cycle has closed and data is retained. Format exactly `YYYY-YY` (`2027-28`); `2027-2028` and `2027` are rejected. A year URL for the current cycle 301s to the current view.
- Completeness is configuration, evaluated by one generic function that logs the failing condition:

```yaml
admissions:
  required: [cycle, classes_open, process_steps, documents]
  any_of:   [start_date, last_date]
  max_age_days: 400
fees:
  required: [cycle, fee_table]
  min_rows: 3
```

## 5. Teacher

A person, not an institution; three rules differ from campus:

- **Slug:** name + school-at-creation, then numeric suffix. The slug says nothing reliable about current school; teacher→campus is a dated relationship by ID.
- **Indexability:** `noindex` by default until the profile is claimed or verified.
- **Removal:** on a valid removal request the URL returns 404 (no redirect, no banner), the slug is retired and never reissued. This is the sole exception to "never 410/404 a retired entity."

## 6. Language

- English at root; other languages under `/{lang}/` (BCP-47). A translated URL exists only when the translation exists; no English content is ever rendered at a `/{lang}/` URL. **Implementation note, 28 Sep 2026:** this is served as a 301 to the English canonical when `/{lang}/{X}` has a real English equivalent at `{X}` (not a hard 404) — §8's one-hop-to-canonical rule applies here too, and Google had already indexed `/hi/exams/aissee` and `/hi/exams/jnvst` before this section's policy went live, so a hard 404 there was discarding real search traffic. An `/{lang}/{X}` with no valid English equivalent at all still 404s.
  *Amended by D-127 (30 Sep 2026):* the `exams` root is a narrow, named exception to "no English content is ever rendered at a `/{lang}/` URL" being enforced by a blanket redirect. `src/proxy.ts` now passes every `/hi/exams/*` request through to the app router instead of 301-ing it, because exam pages can be genuinely, completely Hindi (`examHasCompleteHindi()`, see `exams.md` §5) and the old blanket rule had no way to tell a complete translation from an absent one — it redirected both. The underlying policy is unchanged for every other root (`/school`, `/schools`, etc.): those still 301 to English because no page under them has Hindi content yet. The exam page itself enforces the same completeness gate a second time and redirects to `/en` if it fails, so routing alone passing a request through is not what decides whether Hindi actually renders.
- Every translated page emits `hreflang` for each available language plus `x-default` → English.

## 7. Discovery and facets

- Filters are query parameters (`?board=cbse`), `noindex` by default. Pagination (`?page=2`) is self-canonical and indexable.
- A facet becomes a path segment only when **both** hold:
  - **A. Editorially approved facet type** (`cbse`, `icse`, `boarding`, `girls`, …). Human decision, per type, not per page.
  - **B. Automated gate** on that specific page: campus count and data completeness only. Nothing non-computable in B.
- Hysteresis via config constants, e.g. `FACET_INDEX_MIN = 10`, `FACET_DEINDEX_BELOW = 6` (locality pages may use lower values). Initial values, tuned from data.
- Facets never stack (`/cbse/boarding` is not a URL).

## 8. Redirects

- Every URL ever served 301s to its current canonical form in one hop, indefinitely. Redirect maps are permanent infrastructure.
- Legacy patterns (`/en/…`, `/{city}/{slug}`, `/school/{id}-{slug}`, `/school/{slug}-{code}`, alias slugs) → canonical.
  *Amended by D-122 (28 Sep 2026):* the pre-launch `/{city}/…` and `/school/{id}-{slug}` addresses were never indexed and now 404; only `/en/…` and alias/merged slugs redirect.
- Normalise: uppercase → lowercase; `www` → apex; `http` → `https`; trailing slash → none.
- A URL that has represented one entity is never reused for another.

## 9. Lifecycle

- **Closed campus:** URL stays live with a status banner; data frozen. Never 410.
- **Merged:** absorbed campus 301s to survivor; survivor keeps its slug.
- **Split:** original keeps its slug; new campuses minted fresh.
- **Created in error:** 301 to the correct entity, else to the discovery parent; slug retired.
- **Teacher removal:** §5.

## 10. On-page contract

- `<link rel="canonical">` on every page, absolute, always the canonical form.
- JSON-LD on entity pages: `@type` (School / Person / Event as appropriate), `@id` = canonical URL, `name` = `display_name`, `alternateName` = aliases, `sameAs` = official site/profiles. `identifier` is omitted (the DB ID is not public). Relationships reference canonical URLs.
- Title/H1 use `display_name`; body states the legal name once.
- Sitemaps contain only 200, canonical, indexable URLs.

## 11. Hygiene (middleware)

One hostname (`https://schooloye.com`, no `www`), HTTPS only, lowercase, no trailing slash, query strings never carry identity. New entity classes get their own roots; nothing is squeezed into `/school/`.

## 12. Routing invariant

Every public URL resolves to exactly one of: **200** canonical, **301** to canonical, **404**.

## 13. Invariants enforced in CI

1. `slug` is write-once for entity roots.
2. Relationships reference IDs, never slugs.
3. Minting rejects reserved words and collisions, per root.
4. Every redirect resolves in one hop to a 200 canonical URL.
5. No redirected URL is ever reused for another entity.
6. View and facet indexability go through the generic config evaluator and are logged with the failing condition.
7. Hysteresis thresholds exist for every indexable view/facet.
8. Archive URLs match `^\d{4}-\d{2}$`; current-cycle year URLs 301.
9. Closed campuses remain resolvable; removed teachers return 404.
10. Sitemaps contain no 301 or `noindex` URLs.

## 14. Phasing

1. Routing foundation: `/school/`, `/exams/`, discovery to city level, canonicalisation, redirects, minting, lifecycle.
2. Campus views with the completeness engine.
3. Teacher pages with claim/verify flow.
4. Locality level when data exists.
5. Archived cycles when closed-cycle data exists.
6. Facets once the inventory gate can be measured.

## 15. Definition of done

Every campus has one stable canonical URL; slugs cannot change accidentally; relationships don't depend on slugs; renames need no migration; legacy URLs redirect in one hop; closed campuses stay reachable; current and archived cycles are distinguishable; thin views and uncontrolled facets can't be indexed; indexability doesn't flap and is explainable from logs; canonical tags and JSON-LD identify the same entity; CI enforces the invariants.

---

## Appendix A — How this maps onto the codebase (implementation notes, not rules)

| Guide concept | Implementation |
|---|---|
| Immutable integer PK, never in URLs | `schools.id` is a UUID (internal). `schools.school_code` (6-digit) is also internal from now on — no longer in any URL or JSON-LD |
| Entity slug, write-once | `schools.slug`: unique index, format check (`^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 60), write-once trigger, minted on insert by `mint_school_slug(school_slug_source(name))` — the source drops apostrophes, spells out standalone P/S, H/S, S/S and collapses initials (D-123) |
| `aliases[]` | `schools.aliases text[]`; alias and retired slugs live in `school_slug_redirects` so a URL is never reused |
| Merged / created in error | `schools.merged_into` → 301 to survivor |
| Closed campus | `schools.status = 'closed'` stays public with a banner |
| English at root, `/hi/` only when translated | Internal route tree stays `src/app/[locale]/…`; `src/proxy.ts` rewrites unprefixed paths to `/en/…` internally, 301s `/en/…` to the unprefixed form, and redirects `/hi/…` to the English equivalent until a page is translated — **except** `/hi/exams/*`, which `proxy.ts` passes through unconditionally (D-127, 30 Sep 2026); the exam page itself then redirects to `/en` if that exam's Hindi data is incomplete, so the routing layer's pass-through is not by itself a guarantee of Hindi content |
| Discovery | `/schools/{state}/{city}` uses the district slug as `{city}` (D-116); `/schools/{state}/{city}/{locality}` for localities with published schools. City-states (`states.is_city_state`, Delhi) are one city at `/schools/{state}` (D-126) |
| Legacy URLs | `/en/…` → one 301 to the unprefixed form. Pre-launch `/{city}/…` and `/school/{uuid}-{slug}` addresses 404 (D-122) |

Next.js emits **308** for `permanentRedirect()`; the proxy emits **301**. Both are permanent and treated the same by search engines.

## Appendix B — Open items for architecture review (not yet in the scheme)

1. **Machine twin** `/school/{slug}/index.md` (markdown for AI answer engines, D-048). Kept as-is; needs sign-off as a permitted view.
2. **City admissions page** (D-096, not built yet). Needs a URL under the discovery tree before it's built.
3. **Utility routes** that are neither entities nor discovery: `/admissions/help/*`, `/alerts`, `/compare`, `/guides/*`, `/tools/age-eligibility`, `/teachers`, `/privacy`, `/terms`, `/my/*`, sign-in pages, `/for-schools/*`, `/portal/*`, `/ops/*`. Kept at root, English only.
4. **JSON-LD `identifier`.** The SchoolOye ID is dropped as the guide says; the **board affiliation number** is kept as a `PropertyValue`, since it is a public official identifier, not our DB ID.
5. **Teacher URLs** — decided (D-125): `/teacher/{name}-{teacher_code}`, issued at registration.
6. **`/schools/{state}/{city}` conflates hub and search.** Flagged 2026-09-28, raised by Praveen while investigating an unrelated header-click bug (CSP was blocking hydration site-wide — fixed directly in `next.config.ts`, no URL change). `/schools/{state}` is a pure hub: city directory, no filters, no grid (`StatePageBody`). `/schools/{state}/{city}` is not: `PlaceView`'s city branch renders the same URL as *both* a directory (browse-by-area, browse-by-category links) *and* the filtered search — board/grade/admissions filter form plus the paginated school grid — with `?board=`/`?grade=`/`?admissions=`/`?page=` all living on that one path (`src/app/[locale]/_views/place-page.tsx`). Whether that's worth splitting into a pure city hub plus a separate search/listing URL (a city-level parallel to how state already works — Praveen's suggestion was something like `schools/{city}` for the listing) is an open call, not decided here — new URL patterns need the review this doc requires, and it changes canonical/sitemap/JSON-LD emission for every launched city if adopted. Also interacts with D-126 (city-states collapse `{city}` away for Delhi).
