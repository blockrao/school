# State & city canonical pages — SEO/GEO architecture (v1)

Written 2026-09-28 in response to: build a canonical state page (e.g. "Top Schools in
Haryana") and a canonical city page, both broken down for long-tail search intent
("top private schools in X", "new schools in X", "best boarding schools in X", "top
rated schools in X", etc.), with real school counts and internal linking.

**Every category below was checked against the live database before being marked
viable.** Several of the literally-requested keyword patterns cannot be built
honestly today — not because the idea is wrong, but because the underlying field is
either unpopulated or blocked by the same UDISE-sourcing rule documented in
`architecture-baseline.md`. Building them anyway would mean shipping SEO pages that
say "Private Schools in Sonipat" and return 0 or 1 result — worse for GEO/AI-answer
credibility than not having the page at all. This doc separates **build now** from
**build once the data catches up** and says exactly what's blocking each one.

## Trust-rule constraint (read this before adding any category)

`CLAUDE.md`'s trust rules ban "no star ratings", "no paid ranking", "no 'best'
badges for sale", "no arbitrary quality score." A category page titled "Top Schools
in Haryana" is fine as a keyword-targeting H1/URL **as long as the page is an
honest, complete directory of a real, objective cut of the data** (all CBSE schools;
all girls' schools; schools founded since 2018) — never an editorially-ranked "1.
X School, 2. Y School" list implying SchoolOye judged them. Every category below is
a real filter (board, management type, founding year, gender), sorted alphabetically
or by data completeness, never by an invented score. "Top Rated Schools" specifically
is **not buildable** under this rule — there is no legitimate rating signal in this
schema (see below) — and is reframed as "Fully Verified Schools" instead, which
targets the same search intent (a parent's real underlying want: "which of these can
I trust?") with a real, honest signal.

## Data reality check, checked live 2026-09-28

| Requested category | Backing field | Raw DB coverage | Actually renders (source-gated) | Verdict |
|---|---|---|---|---|
| Top Schools in [State/City] | — (the base directory itself) | 10,668 schools, name+address+pincode | 8,298 status=published; varies hugely by area (see the is_launch chart from earlier this session — Delhi clean, most of Haryana still UDISE-blocked) | **Build now** — this is the page itself |
| Top CBSE Schools in [City] | `school_affiliations` → `boards` | 439 affiliation rows total, nationwide | Same 439 (this table isn't provenance-gated the way `schools` columns are) | **Build now, but thin outside Jaipur** — Jaipur has real coverage; most of the Haryana/Delhi bulk import never got affiliation rows written at all. Gate the link on count > 0 per area. |
| Top Private Schools in [City] | `schools.management = 'private_unaided'` | 8,462 of 10,668 | **43 nationwide** | **Blocked.** Same UDISE root cause as address/pincode — `management` came from UDISE for nearly every bulk-imported row, and UDISE-sourced fields are never shown per the view's standing rule. Do not build until management is re-verified from an allowed source. |
| Government Schools in [City] | `schools.management = 'government'/'central_government'` | 40 nationwide | Included in the 43 above | **Blocked**, same reason, and thin even before the block (only 40 government schools exist in this dataset at all — most of the launch markets are private-school-heavy by nature). |
| New Schools in [City] (est. since 2018) | `schools.established_year` | 7,308 of 10,668 have a value; 138 since 2018 | **377 render nationwide** (any allowed source), unknown how many are within 2018+ specifically | **Blocked for now** — same UDISE pattern. Re-check after a re-verification pass; even then this is a naturally thin category everywhere (new schools are rare by definition). |
| Best Boarding Schools in [City] | — | **No boarding/day field exists anywhere in the schema** (checked `schools`, `facilities` taxonomy, `school_facilities` — 0 rows) | — | **Not buildable at all** without a new field. The CISCE CSV loaded this session had a `day_boarding` column that was never carried into the DB — flagging as a real, fixable gap (see Action items). |
| Girls' Schools / Boys' Schools in [City] | `schools.gender` | 30 girls, 24 boys nationwide (out of 8,175 with a value) | Not individually checked but `gender` is provenance-gated like `management` — expect similarly blocked | **Blocked**, and inherently a very thin category (co-ed dominates this dataset almost totally: 8,121 of 8,175). |
| Top Rated Schools in [City] | — | `schools.tier` is **'B' for all 10,668 rows** (an unset default, not real data); `verification` = 'source_verified' for only 9 schools nationwide | — | **Not buildable as "rated."** No legitimate signal exists. Reframed as "Fully Verified Schools" (see below) — even that is thin (9 schools) until verification work scales up. |
| IB / Cambridge Schools in [City] | `school_affiliations` → `boards` (IB=2 rows, CAIE=1 row nationwide) | 3 total | 3 | **Technically buildable, not worth a page** — would show 0-1 results almost everywhere. Listed here so it isn't "discovered" and built later without this context. |

## What ships in this pass

1. **State canonical page** (`/[locale]/[state]`) — the literal, unambiguous ask.
   Real data (city list + counts) exists for every state today. See "Page anatomy."
2. **City canonical page, enhanced** — adds a real "Browse by category" block using
   only the categories marked **Build now** above (the base list, and CBSE
   affiliation where it exists), each gated on a non-zero count for that specific
   area so a thin-data city simply shows fewer category chips instead of a
   0-result link.
3. Both pages get proper breadcrumbs, canonical URLs, and `CollectionPage`/
   `BreadcrumbList` JSON-LD per `CLAUDE.md`'s SEO/GEO section.

## What's explicitly deferred, and why

Turning "CBSE Schools in Gurugram" into its **own indexable landing page** (not just
a filtered view of the city page canonicalized back to the bare city URL — which is
what ships in this pass, for navigational/internal-linking value only) is the real
unlock for the "unfair SEO/GEO advantage" framing: a page with its own H1, meta
description, and URL (`/{city}/cbse-schools`) ranks for that exact long-tail phrase.
The existing `[city]/[entitySlug]` route already resolves one URL segment multiple
ways (school vs. locality) — the same pattern extends cleanly to a curated set of
category slugs. Not done in this pass (time), and gated on the Private/Government/
New-Schools categories actually having real data to fill them — building a dedicated
landing page that's blocked from rendering its core fact is worse than not building
it.

## Page anatomy

### State page — `/[locale]/[state]` (e.g. `/en/haryana`, `/en/rajasthan`, `/en/delhi`)

- H1: "Schools in {State}" (not "Top Schools in {State}" as the literal H1 — "Top"
  works as a secondary heading/meta-description pattern, but the H1 should match
  how a parent actually searches: "schools in Haryana" outranks "top schools in
  Haryana" in real search volume, and it's the more honest label for what the page
  actually is, a directory).
- Total school count for the state (sum across every launched city in it).
- Cities breakdown: every launched city in the state, each as a card/link with its
  own real count, sorted by count descending — this is the state page's main
  content and its main internal-linking job (every state page links to every city
  page in that state, and every city page links back up to its state).
- "Browse by category" block: state-wide category links (Top CBSE Schools in
  {State}, etc.) using the same **build-now** gate as the city page.
- Breadcrumb: Home → {State}.
- `CollectionPage` JSON-LD with `about` = the state, and an `ItemList` of the
  child cities.
- Not sitemapped as its own city-style sitemap in this pass (states aren't
  "launched areas" in the is_launch sense — a state is launched the moment any one
  of its cities is) — added to `sitemap-site.xml`'s static/non-city-scoped entry
  list instead.

### City page — existing page, additive only

- Unchanged: H1, breadcrumb, locality breakdown, filters, school grid.
- New: "Browse by category" block directly under the locality breakdown, listing
  only categories with count > 0 for this city (e.g. a city with 0 CBSE-affiliated
  rows shows no CBSE chip at all — never a chip pointing at an empty result).
- New: a "state" link added to the breadcrumb's first item is already there
  (`city.stateName`) but currently plain text, not a link — made a link to the new
  state page for the up-the-hierarchy interlink.

## Action items for later

1. Re-verify `management`/`gender`/`established_year` for at least the Haryana bulk
   import against an allowed source (SARAS, school site, ops call) — same rigorous
   approach already chosen for address/pincode — before building the Private/
   Government/New-Schools category pages.
2. Add a boarding/day field to the `schools` table (data repo's job, per
   `CLAUDE.md`'s ownership split) — the CISCE CSV already had this data
   (`day_boarding` column) and it was never carried into a real column.
3. Once categories 1–2 have real numbers, give each curated category its own
   canonical sub-page (`/{city}/cbse-schools`, `/{city}/new-schools`, etc.) via the
   `[entitySlug]` resolver, with its own title/meta/H1 — this is the actual "unfair
   SEO advantage" move; what ships now is the honest, real-data foundation it sits
   on.
