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

- **Confirmed database shape (production catalog):** `public.school_posts` already has canonical `id`, `school_id`, `kind`, `title`, `body`, `source_url`, `review`, `reviewed_by`, `reviewed_at`, `created_by`, `published_at`, `created_at`, `updated_at`, `post_code`, `slug`, `tier`, `requested_tier`, `listing_requested_at`, `listing_review`, `listing_reviewed_by`, `listing_reviewed_at`, `rejection_reason` and `withdrawn_at`. The public projection is `api.public_school_news`, with the school/post identifiers, `kind`, title/body/source URL, published timestamp and listing-review fields. This gives us an existing moderation/listing lifecycle to reuse.
- **Important schema gap:** the current `school_posts` schema does not include a typed topic, academic year/session, classes, opening date or closing date. Those fields must not be implied from the post body. Before implementing the feature, add a constrained topic and structured metadata (or a one-to-one details table) with validation and an allowlisted `api.public_school_news` projection. Decide whether topic belongs on the post or a typed details table based on migrations and current enum consumers; do not alter the existing `kind` enum blindly.
- **Reuse:** `school_posts`, the current public school-news view and the current site-wide news aggregator; keep one canonical post ID/slug and one publication/listing lifecycle.
- **Do not add a second publication pipeline:** admission topic uses existing ownership, content review, listing-request/review, withdrawal and canonical slug behavior. Structured admission dates should only affect display/discovery state, not bypass moderation.
- **Public API contract:** keep the new metadata in curated `api.*` views and Zod contracts; do not expose raw `public.school_posts` or internal moderation fields. Regenerate DB types from the authoritative schema after migration.
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

## Dependency inventory confirmed during implementation review

This inventory is based on the current application source and production schema catalog. It is deliberately explicit because removing only the directory route would leave cycle-dependent code in place.

### Public directory

- `src/app/[locale]/schools/page.tsx` parses the `admissions=open` query parameter, passes `admissionsOpen` into the school query, calls `getAdmissionDeadlinesBySchoolId`, renders the “Admissions open now” checkbox/filter chip, and displays per-school closing dates.
- The replacement must remove the filter parameter and its query plumbing, the deadline lookup used only for legacy cycles, the filter checkbox/chip, related SEO copy and WhatsApp reminder copy that promises admission-cycle alerts. Preserve unrelated board, grade, comparison, shortlist and city filters.
- Do not retain a hidden `admissions=open` database query after removing the UI.

### Canonical school profile

- `src/app/[locale]/_views/entity-page.tsx` currently loads `getPublicAdmissionsBySchoolId`, `getRecentAdmissionUpdatesBySchoolId`, and cycle-based deadlines. It builds eligibility cycles, selects a primary cycle for the decision strip, renders the Admissions and Recent admission updates sections, and exposes a cycle-specific lead form through `submitAdmissionLead`.
- The new announcement must join the existing school-news/activity projection using a bounded query and canonical post URL. It must not feed old cycle rows into the new announcement card or label an announcement as a verified admission cycle.
- Remove the cycle-based section, eligibility checker and recent-cycle-update rendering only when the new announcement component is live. Keep general school contact/enquiry paths if they are not admission-cycle-specific.
- Review school JSON-LD and metadata so removed cycle facts are not still emitted as structured data or claims.

### Dedicated admissions directory and lead-capture dependency

- `src/app/[locale]/admissions/page.tsx` is currently backed by `listPublicAdmissionCycles` and contains a separate admissions directory, filtering/status logic, and cycle-oriented application tracking.
- Existing `admission_leads` rows require `admission_cycle_id` and are linked to the old cycle model. They cannot simply be re-pointed to a post ID. Preserve this table and its data until a separate retention/privacy decision is made; do not leave a visible lead form pointing at a removed cycle.
- The root `/admissions` route should ultimately redirect to `/news`, but `/admissions/help` and exam admission routes must remain untouched.

### Production catalog observations

- The production API schema currently exposes `api.public_school_admissions`, `api.public_admission_updates`, `api.public_exam_admissions`, and `api.public_school_news`.
- `public.admission_cycles` contains the legacy school-cycle fields (academic year, class, status, dates, fees, application/notice URLs, eligibility and verification). It also contains `exam_id`, so dropping the table or shared enum/types would risk breaking exam-related behavior.
- `public.school_posts` already has canonical post identity/slug, author, content review, publish timestamp, listing request/review, rejection reason and withdrawal timestamp. `api.public_school_news` is its current curated projection.
- `public.admission_leads` is explicitly cycle-linked; `public.admission_notices` is a separate notice-ingestion/review workflow. Neither should be deleted as a side effect of removing the public school-cycle directory.

### Required migration sequence

1. Introduce structured admission topic/metadata on the post model (or a one-to-one table), with database constraints for valid date order and server-side HTTPS URL validation. Make the new public projection return only fields approved for public display.
2. Regenerate DB types and Zod contracts from the authoritative schema. Add tests for ownership, moderation/listing gates, missing dates, invalid dates/URLs, withdrawn/expired posts and locale rendering.
3. Add a single post-based admission-announcement read model used by both school profile and `/news`; do not create a second status table or publishing lifecycle.
4. Migrate the school portal composer only after locating and verifying the actual existing school-post write/moderation actions. Do not assume a composer/action exists based only on the presence of `school_posts`.
5. Switch school profile and site-wide news rendering, and verify listing approval semantics with a test school.
6. Remove directory filter/deadline lookups and redirect `/admissions` to `/news`; preserve `/admissions/help` and exam routes.
7. Run repository-wide reference scans and production catalog dependency checks. Revoke public grants/drop obsolete views only after no live consumers remain and smoke tests pass.
8. Validate redirect/canonical/sitemap behavior, cache freshness and rollback procedure before release.

## Explicitly unresolved before schema implementation

- Whether `school_posts.kind` should remain the existing `news | press` enum with a separate typed `topic`, or be migrated to a broader content taxonomy. Prefer a separate topic over overloading the current kind.
- Whether a school may publish an admission announcement immediately on its own page, as organic news currently can, while requiring listing approval for `/news`. Default: follow the established news behavior and never bypass existing publication rules.
- Whether to keep any legacy cycle records for internal operations/alerts. Decide from actual consumers and retention obligations; do not delete data as a side effect of UI cleanup.
