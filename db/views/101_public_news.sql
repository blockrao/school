-- api.public_news: the SITE-WIDE /news aggregator feed (SEO/GEO follow-up,
-- 29 Sep 2026, 20260929050000_events_and_news_depth.sql). Distinct from
-- api.public_school_news (095), which is each school's own-page feed and
-- shows a post the moment it's live there. This view is the additional,
-- ops-gated step: a post only appears here once the school has requested a
-- listing AND ops has approved it (`listing_review = 'approved'`) — same
-- underlying `review`/`published_at`/D-119 school-status gates as 095, plus
-- the listing gate on top.
create or replace view api.public_news as
select
  sp.id,
  sp.school_id,
  s.slug as school_slug,
  s.name_en as school_name,
  s.city_id,
  sp.kind,
  sp.title,
  sp.body,
  sp.source_url,
  sp.published_at,
  sp.post_code,
  sp.slug as post_slug,
  sp.tier,
  sp.listing_reviewed_at
from school_posts sp
join schools s on s.id = sp.school_id
where sp.review = 'approved'
  and sp.published_at is not null
  and sp.listing_review = 'approved'
  and s.status = 'published';

grant select on api.public_news to anon, authenticated;
