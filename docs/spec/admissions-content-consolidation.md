# School admissions content consolidation

**Status:** implementation in progress; migration authored but not applied; production and CI verification outstanding
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

- **School page:** a dedicated Admissions section reads approved school-post announcements and displays title/body, session, classes, supplied opening/closing dates, and official application/notice links. These items are excluded from the general What's happening feed to avoid duplicate cards; ordinary news/events/jobs continue in that feed.
- **Site-wide discovery:** `/news` contains the same item and uses the same publication/listing approval gate as other school posts. A topic chip/filter may be added to the existing news feed only if it uses indexed, bounded queries and has sufficient inventory; no new `/admissions` feed.
- **School directory/search:** do not claim “Admissions open now” from legacy cycle rows. The filter is removed until the unified announcement model can derive a trustworthy state from published, current admission announcements. This avoids the current unbounded secondary lookup of all open cycles followed by a school-ID `IN` filter.
- **Application links:** link to the school's supplied destination or notice; SchoolOye does not imply it operates the application form. Existing lead-capture must not be reused without a separate privacy, consent, retention and authorization review.
- **Dates and status:** status is derived at render/query time from supplied dates in India Standard Time; stored editorial state is not treated as truth about whether the date window is currently open. Missing dates produce “Dates not provided,” not “open.”

## Data and architecture

- **Confirmed database shape (production catalog):** `public.school_posts` already has canonical `id`, `school_id`, `kind`, `title`, `body`, `source_url`, `review`, `reviewed_by`, `reviewed_at`, `created_by`, `published_at`, `created_at`, `updated_at`, `post_code`, `slug`, `tier`, `requested_tier`, `listing_requested_at`, `listing_review`, `listing_reviewed_by`, `listing_reviewed_at`, `rejection_reason` and `withdrawn_at`. The public projection is `api.public_school_news`, with the school/post identifiers, `kind`, title/body/source URL, published timestamp and listing-review fields. This gives us an existing moderation/listing lifecycle to reuse.
- **Implementation state:** `supabase/migrations/20261011160000_school_post_admission_metadata.sql` adds `topic`, academic year/session, class codes, opening/closing dates, and application/notice URLs to `school_posts`, with checks and appended fields in `api.public_school_news` and `api.public_news`. The migration was corrected for malformed/duplicated SQL, but it has **not** been applied to production and must be reviewed/executed before deploying code that expects these columns.
- **Reuse:** `school_posts`, the current public school-news view and the current site-wide news aggregator; keep one canonical post ID/slug and one publication/listing lifecycle.
- **Do not add a second publication pipeline:** admission topic uses existing ownership, content review, listing-request/review, withdrawal and canonical slug behavior. Structured admission dates should only affect display/discovery state, not bypass moderation.
- **Public API contract:** Zod contracts, portal forms/actions, the generated type mirror, school profile, and `/news` rendering have been updated on the feature branch. The DB type file is still a manually maintained mirror because `DATABASE_URL_RO` was unavailable; regenerate from the authoritative schema when credentials are available and verify drift.
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

1. Initial inventory and cleanup are underway: the public profile, locality/city/town directory, homepage school-cycle widget, old `/admissions` directory route, and shared school-cycle read adapters have been switched off the legacy school-cycle model. Remaining SQL views/grants, alerts, type references, analytics, sitemap/robots and connected flows still require a repo-wide/catalog check.
2. Apply and verify the schema migration in a non-production database first. The current branch UI is already wired to the new fields, so do not deploy it before the migration is applied; a feature flag has not been added.
3. Add contract/unit tests for date validation and IST-derived status; integration tests for school ownership, publication gates, listing approval, withdrawal, closed school, missing dates and unsafe URLs.
4. Still outstanding: verify a test school's announcement from portal submission through its profile and `/news`, including the listing-approval gate and withdrawal behavior.
5. The `/admissions` root now redirects to `/news`. Legacy cycle-driven profile cards/lead form, directory filter/deadline lookups, and the home-page school-cycle widget have been removed from the branch. Exam application windows and `/admissions/help` remain separate.
6. Remove old public views/grants/contracts only after a repo-wide dependency scan, generated-type regeneration, live `pg_depend`/catalog inspection and successful production smoke tests.
7. Check query plans, response sizes and cache freshness; confirm no route continues to issue reads to the legacy views.
8. Still outstanding: run full CI, route smoke tests, SEO/canonical checks and rollback rehearsal before go-live. Vercel currently reports a build-rate-limit failure; no successful build or end-to-end verification has been confirmed.

## Dependency inventory confirmed during implementation review

This inventory is based on the current application source and production schema catalog. It is deliberately explicit because removing only the directory route would leave cycle-dependent code in place.

### Public directory

- **Implemented on branch:** removed the `admissions=open` filter from the global school list and state/city/town discovery pages, removed cycle-derived deadline lookups, and replaced misleading open/closing status with a neutral profile-announcement prompt.
- **Implemented on branch:** removed the homepage's school-cycle query from the exam-window module. That module now reports exam application windows only; school announcements are available on school profiles and `/news`.
- **Remaining:** verify every directory route and alert workflow for references to `api.public_school_admissions`; do not restore an “open now” claim unless it is derived from published announcement dates with explicit timezone semantics.

### Canonical school profile

- **Implemented on branch:** `src/app/[locale]/_views/entity-page.tsx` now derives admission announcements from the existing `getPublicSchoolNewsBySchoolId` result, displays structured session/class/date fields and official application/notice links, and no longer queries school admission cycles or recent cycle updates.
- **Implemented on branch:** removed the profile's cycle-specific eligibility widget and the legacy cycle-linked lead form. The general school enquiry/contact path remains available.
- **Regression gate:** run the section-order test, verify the profile and `/news` against a test school, and confirm ordinary news posts continue to render unchanged. The announcement fields will not work against a database until the new migration is applied.

### Dedicated admissions directory and lead-capture dependency

- **Implemented on branch:** `src/app/[locale]/admissions/page.tsx` redirects the obsolete school-admissions directory root to `/news`. School-specific `/school/{slug}/admissions` routes redirect through the canonical campus-view redirect.
- **Implemented on branch:** the cycle-linked `submitAdmissionLead` action was removed from the school-profile actions module. Existing `admission_leads` rows and the lead-management portal remain intact for historical/admin use; no data has been deleted or remapped.
- **Preserved:** `/admissions/help`, checkout, user order history, exam admission pages, and exam eligibility tools.
- **Remaining:** audit links, alerts, and analytics for any assumptions that a new school lead must be associated with a current cycle. Do not repurpose `admission_cycle_id` to store a post ID.

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
