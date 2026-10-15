# City hub page (15 Oct 2026)

Every city gets one hub at `/schools/{state}/{city}` (Delhi: `/schools/delhi`). It is the entity page for the *city* in the same way `/school/{slug}` is for a school: edge-cached, one canonical URL, structured data, markdown twin. The home page is a national landing page that links to every city hub (largest first, no pilot city).

Reference: Careers360's Gurgaon page (hub + `/schools/cbse-schools-in-gurgaon`, `/english-medium-schools-in-gurgaon`, locality lists, admission-process and FAQ blocks). We match its coverage and beat it on trust: no paid ranking, every fact labelled with its source.

## Sections, in order

1. **Header**: H1 "Schools in {city}, {state}", honest count, last-updated date, breadcrumb (BreadcrumbList).
2. **Browse by board**: CBSE / ICSE / state board / IB / Cambridge, each with count (links to board hubs below).
3. **Browse by grade level**: primary, middle, secondary, senior secondary.
4. **Admissions open now** (only when real dates exist; hidden otherwise).
5. **Browse by locality** (when locality data exists; Gurugram has none yet).
6. **Browse by type**: co-ed / boys / girls, English / Hindi medium, day / boarding (each only when data exists).
7. **"Most complete profiles"** (see decision below), not "top schools".
8. **All schools**: paginated, filterable list (existing).
9. **How admissions work in {city}** + documents + FAQ (FAQ answered from our own data and written copy; plain-text, no FAQPage schema).
10. **Nearby cities**.

## Sub-hubs (indexable, cacheable, path-based)

`/schools/{state}/{city}/{facet}` with facet in `cbse-schools`, `icse-schools`, `state-board-schools`, `primary-schools`, `secondary-schools`, `senior-secondary-schools`, later `english-medium-schools`, `co-ed-schools`, localities. Rule: a sub-hub is generated and put in the sitemap only if it has at least 5 schools, so there are no thin pages. Filter query strings stay noindex/canonical to the nearest hub.

## Structured data

`CollectionPage` + `ItemList` (done), `BreadcrumbList`, and `Place`/`AdministrativeArea` for the city with `containsPlace` omitted (no hand-built lists in JSON-LD).

## Decisions

- **"Top schools"**: SchoolOye publishes no ratings, no paid ranking. Ranking without a defensible basis is the biggest trust and legal risk on this page. Recommended: "Most complete profiles" (ordered by verified-fact coverage), plus clearly labelled editorial lists later. Needs Prav's call.
- **URL shape**: path facets above (cacheable, one URL per intent) rather than query strings.

## Build order

1. Board and grade sub-hubs + sitemap rule + browse blocks on the hub (data exists today).
2. Admissions/FAQ block, nearby cities.
3. Locality, type and medium facets as the data arrives.

## URL taxonomy (decided 15 Oct 2026)

Pattern used by the directory leaders (Careers360 and Shiksha for schools, Practo/Justdial for local services, Zillow for homes): the city page is the hub, categories-in-city are separate indexable pages, and each entity has one flat URL.

| Page | URL | Cached | Indexed |
|---|---|---|---|
| City hub | `/schools/{state}/{city}` | yes | yes |
| Full listing | `/schools/{state}/{city}/all-schools` (+`?page=N`) | page 1 yes | yes, self-canonical per page |
| Board hub | `/schools/{state}/{city}/{cbse|icse|…}-schools` | yes | yes, 5+ schools |
| Locality | `/schools/{state}/{city}/{locality}` | yes | yes |
| School | `/school/{slug}` | yes | yes |
| Filters / compare | any of the above with `?board= ?grade= ?admissions= ?compare=` | no | noindex, canonical to base |

Old `/schools/{state}/{city}?page=N` URLs keep working and canonicalise to `/all-schools`. Delhi (city-state) stays a single listing page for now.

### Why this shape (research, 15 Oct 2026)

- Google treats keywords in URLs as a very small ranking factor (Mueller: "very small" 2016, "overrated" 2017) and has said folder structure choices are unlikely to make or break a site. Breadcrumbs often replace the URL in results. What matters: one stable canonical URL per page, lowercase, hyphenated, consistent trailing-slash handling, no duplicate paths.
- Answer engines (ChatGPT, Claude, Perplexity) read page content, structured data and the markdown twin, not URL keywords. A readable, stable URL helps when it is cited as plain text.
- Competitors put the keyword in a flat slug (`/schools/schools-in-gurgaon`, `/cbse-schools-in-gurgaon`). We use a hierarchy instead. Reasons: the state segment disambiguates same-named cities as the platform goes national, it gives a real state hub (`/schools/haryana`) and clean breadcrumbs, and the exact query phrase ("Schools in Gurugram") lives in the title and H1 where it counts.
- Decision: keep `/schools/{state}/{city}`. Do not rename; every rename costs redirects and discards signals.
- Rules that keep it clean: reserved segments (`all-schools`, `*-schools`) cannot be used as locality slugs (checked 15 Oct: none exist); city slugs are unique across areas (checked: 24 areas, no duplicates); filters stay in query strings and canonicalise to the base page.
- Known inconsistency to resolve: Delhi (city-state) lives at `/schools/delhi`, with no city segment.
