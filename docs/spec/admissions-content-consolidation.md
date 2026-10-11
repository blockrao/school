# School admissions content consolidation

**Status:** proposed implementation contract for go-live
**Scope:** replace the legacy, cycle-driven public school-admissions discovery flow with the existing school content publication model used by news, jobs and events.
**Non-goals:** this does not remove exam-admission cycles, exam eligibility, the separate paid `/admissions/help` service, or internal audit/history data.

## Decision

SchoolOye will not operate a separate public `/admissions` directory backed by `api.public_school_admissions`. A school announces admission availability as a school-authored publication in the existing content system. It appears in the school's own activity/news area and, when the school requests listing and the existing listing review is approved, in the site-wide `/news` feed. There is no separate “admission press” product, public API, listing algorithm, or parallel approval pipeline.

Admission test dates that need calendar/event behavior remain events. An announcement is not silently promoted into an event, and an event is not treated as proof that admissions are open.

## School workflow

1. A verified school member opens the existing school portal's **News & updates** composer and chooses **Admission announcement** as a topic/template, not a separate content product.
2. The school enters a concise title and body, academic year/session, classes/grades covered, opening date, closing date (optional), application destination (optional), and official notice/source URL (optional). All dates are optional unless the school asserts them; missing data is displayed as “Not provided,” never guessed.
3. The portal validates dates, class labels and external URLs. Closing date cannot precede opening date. URLs must be HTTPS and normalized/validated server-side. The portal records who submitted and when.
4. Publishing follows the existing school-post workflow: draft/submission, school-page visibility according to the existing post publication rules, and site-wide listing only through the existing listing-request/review gate. Admission topic must not bypass school publication status or content moderation.
5. The school can edit/update/withdraw the announcement using the same content lifecycle. A changed date is a new content revision/update, with audit history retained. Expired announcements remain reachable at their canonical URL with an explicit expired state, but disappear from active discovery results.
6. Ops can reject, unlist or remove a misleading announcement using the same controls as other posts. “School submitted” and “officially verified” are distinct claims; only show a verified label if there is a real review/evidence workflow supporting it.

## User experience

- **School page:** admission announcements appear in the existing News/What's happening stream, newest relevant item first, with a visible Admission label, school name, academic year/classes, opening/closing dates when supplied, freshness timestamp, and a clear application/official-notice link when supplied.
- **Site-wide discovery:** `/news` contains the same item and uses the same publication/listing approval gate as other school posts. A topic chip/filter may be added to the existing news feed only if it uses indexed, bounded queries and has sufficient inventory; no new `/admissions` feed.
- **School directory/search:** do not claim “Admissions open now” from legacy cycle rows. The filter is removed until the unified announcement model can derive a trustworthy state from published, current admission announcements. This avoids the current unbounded secondary lookup of all open cycles followed by a school-ID `IN` filter.
- **Application links:** link to the school's supplied destination or notice; SchoolOye does not imply it operates the application form. Existing lead-capture must not be reused without a separate privacy, consent, retention and authorization review.
- **Dates and status:** status is derived at render/query time from supplied dates in India Standard Time; stored editorial state is not treated as truth about whether the date window is currently open. Missing dates produce “Dates not provided,” not “open.”

## Data and architecture

- **Reuse:** `school_posts`, the current public school-news view and the current site-wide news aggregator; keep one canonical post ID/slug and one publication/listing lifecycle.
- **Add only after inventory review:** a typed topic field and nullable structured admission metadata on `school_posts` (or a one-to-one details table if constraints warrant it). Do not encode machine-readable dates only in prose. Keep the public API contract allowlisted and versioned.
- **Do not expose raw tables:** browser/public reads remain through `api.*` curated views and Zod contracts. School-member writes remain authenticated server actions/RLS. Ops-only moderation remains server-side.
- **Keep separate:** `admission_cycles`/exam admission data if still used by `api.public_exam_admissions`, exam pages, eligibility tools, or alerts. Do not drop these tables or enum types as part of this consolidation.
- **Legacy `api.public_school_admissions` and `api.public_admission_updates`:** first remove all public-page, contract, generated-type, navigation, analytics, test and migration references. Then revoke public grants and remove views in a versioned migration only after the new flow is deployed and dependency checks prove no live consumer remains. Keep `admission_cycles`/audit data until a separate retention/migration decision.
- **Compatibility:** redirect the old `/admissions` root to `/news`; do not redirect `/admissions/help`, exam routes, or the school's canonical URL. Preserve query-independent canonical behavior; old query filters should not be carried into the news feed.

## Performance requirements

- Do not load every admission cycle and filter in application memory.
- The news feed must use the existing approved/listed public view, bounded ordering and pagination before volume requires keyset pagination.
- School pages must fetch the content feed in a bounded query; no N+1 query per post.
- Index the actual predicates and sort keys (school ID, publication/listing status, published timestamp) only after checking existing indexes and query plans.
- Cache/revalidate with the same freshness contract as news; a school update must appear within the documented revalidation window, not require a deployment.
- Avoid parallel calls to the old admission views after the new post projection becomes authoritative.

## Rollout and acceptance gates

1. Inventory all code, SQL views, grants, contracts, generated DB types, actions, tests, links, sitemap/robots rules and analytics that reference the old public school-admissions views.
2. Ship the new structured admission-topic contract and school portal UI behind an explicit feature flag or disabled until the schema and validation are live.
3. Add contract/unit tests for date validation and IST-derived status; integration tests for school ownership, publication gates, listing approval, withdrawal, closed school, missing dates and unsafe URLs.
4. Verify a test school's announcement from portal submission through school page and `/news`, and verify it is absent from site-wide discovery before listing approval.
5. Remove the old `/admissions` page and directory/card filters; redirect the old root to `/news`.
6. Remove old public views/grants/contracts only after a repo-wide dependency scan, generated-type regeneration, live `pg_depend`/catalog inspection and successful production smoke tests.
7. Check query plans, response sizes and cache freshness; confirm no route continues to issue reads to the legacy views.
8. Run full CI, route smoke tests, SEO/canonical checks and a rollback rehearsal before go-live.

## Explicitly unresolved before schema implementation

- Whether `school_posts.kind` should remain the existing `news | press` enum with a separate typed `topic`, or be migrated to a broader content taxonomy. Prefer a separate topic over overloading the current kind.
- Whether a school may publish an admission announcement immediately on its own page, as organic news currently can, while requiring listing approval for `/news`. Default: follow the established news behavior and never bypass existing publication rules.
- Whether to keep any legacy cycle records for internal operations/alerts. Decide from actual consumers and retention obligations; do not delete data as a side effect of UI cleanup.
