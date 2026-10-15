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
