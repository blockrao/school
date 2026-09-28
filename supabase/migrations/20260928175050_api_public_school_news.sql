-- api.public_school_news: curated public read surface for school-authored news/press
-- posts (Increment 10). The underlying `school_posts` table stays fully protected —
-- RLS on it only grants school members select/insert on their own school's rows (see
-- supabase/migrations/20260926092026_school_posts_news_and_pr.sql); there is no anon
-- policy on the base table, and this migration deliberately does not add one. Instead
-- this view (running as its owner, same mechanism every other api.* view over an
-- RLS-protected table already uses) exposes only rows that are:
--   - review = 'approved'   (ops has reviewed and approved the post)
--   - published_at is not null   (the school/ops has actually published it, not just
--     had it approved and left sitting)
--   - the owning school is status = 'published'   (same D-119 publish gate as every
--     other public view)
-- Reviewer/author identity (`reviewed_by`, `created_by`) and internal workflow state
-- (`review`, `reviewed_at`, timestamps) are never exposed here.
create or replace view api.public_school_news as
select
  sp.id,
  sp.school_id,
  s.slug as school_slug,
  sp.kind,
  sp.title,
  sp.body,
  sp.source_url,
  sp.published_at
from school_posts sp
join schools s on s.id = sp.school_id
where sp.review = 'approved'
  and s.status = 'published'
  and sp.published_at is not null;

grant select on api.public_school_news to anon, authenticated;
