-- api.public_school_news: curated public read surface for school-authored news/press
-- posts (Increment 10). The underlying `school_posts` table stays fully protected —
-- RLS on it only grants school members select/insert on their own school's rows (see
-- supabase/migrations/20260926092026_school_posts_news_and_pr.sql); there is no anon
-- policy on the base table, and this migration deliberately does not add one. Instead
-- this view (running as its owner, same mechanism every other api.* view over an
-- RLS-protected table already uses) exposes only rows that are:
--   - review = 'approved'   (own-page visibility gate — the school's own detail page.
--     As of 20260929050000_events_and_news_depth.sql, organic self-published posts are
--     set to 'approved' immediately by the portal action, not held for ops pre-review;
--     `review` now means "this post is live on the school's own page", not "ops signed
--     off before anyone could see it". Featured/press_release-tier posts still go
--     through a real ops review before `review` flips to 'approved', since ops/sales
--     is the one creating/finishing those rows.
--   - published_at is not null   (the school/ops has actually published it, not just
--     had it approved and left sitting)
--   - the owning school is status = 'published'   (same D-119 publish gate as every
--     other public view)
-- This view is the SCHOOL'S OWN PAGE feed only — it does not filter on
-- `listing_review`, so a post appears here whether or not the school has ever
-- requested (or been granted) a spot on the site-wide /news aggregator. See
-- 101_public_news.sql for the site-wide, listing_review='approved'-gated feed.
-- Reviewer/author identity (`reviewed_by`, `created_by`) and internal workflow state
-- (`review`, `reviewed_at`, timestamps) are never exposed here.
--
-- Increment (SEO/GEO follow-up, 29 Sep 2026): appended `post_code`, `slug`, `tier`,
-- `listing_requested_at`, `listing_review` at the end — see 020_public_school_admissions.sql's
-- header for why new columns must always be appended, never spliced in earlier.
--
-- Increment (20260929090000_activity_admissions_v1.sql): appended
-- `withdrawn_at` and added the `withdrawn_at is null` filter — a withdrawn
-- post is pulled from this own-page feed like any other own-page visibility
-- gate. (This file had drifted from the live view definition until this
-- pass — corrected here to match.)
--
-- Increment (SEO/GEO follow-up, canonical-page fix, 29 Sep 2026): appended
-- `school_name`, `city_id`, `listing_reviewed_at` — this view is now also
-- read by getPublicNewsByCode() (src/lib/db/public-adapter.ts) to resolve the
-- canonical /news/{slug} page, not just the school's own-page News section.
-- Previously that lookup read the site-wide, listing_review-gated
-- api.public_news instead, so an organic (non-listed) post's own canonical
-- page 404'd — this view has no such gate, matching the "live on the
-- school's own page immediately" design intent.
create or replace view api.public_school_news as
select
  sp.id,
  sp.school_id,
  s.slug as school_slug,
  sp.kind,
  sp.title,
  sp.body,
  sp.source_url,
  sp.published_at,
  sp.post_code,
  sp.slug as post_slug,
  sp.tier,
  sp.listing_requested_at,
  sp.listing_review,
  sp.withdrawn_at,
  s.name_en as school_name,
  s.city_id,
  sp.listing_reviewed_at
from school_posts sp
join schools s on s.id = sp.school_id
where sp.review = 'approved'
  and s.status = 'published'
  and sp.published_at is not null
  and sp.withdrawn_at is null;

grant select on api.public_school_news to anon, authenticated;
