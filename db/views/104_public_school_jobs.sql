-- api.public_school_jobs: each school's OWN-PAGE jobs feed (29 Sep 2026,
-- 20260929060000_school_jobs.sql). Mirrors 102_public_school_events.sql
-- exactly: `school_jobs` stays fully RLS-protected; this view exposes every
-- job for a published school regardless of `listing_review`, because posting
-- a job makes it live on the school's OWN page immediately — no ops
-- pre-review for that tier of visibility. Filled/cancelled jobs are still
-- returned (with `filled_at`/`cancelled_at` exposed) rather than hidden, so
-- the canonical page persists and the school's own page can show "Filled" /
-- "Closed" instead of the job silently vanishing. See 105_public_jobs.sql
-- for the site-wide, listing_review='approved'-gated aggregator.
create or replace view api.public_school_jobs as
select
  sj.id,
  sj.school_id,
  s.slug as school_slug,
  sj.job_code,
  sj.slug as job_slug,
  sj.title,
  sj.employment_type,
  sj.subject,
  sj.description,
  sj.experience_required,
  sj.salary_range,
  sj.location,
  sj.apply_url,
  sj.apply_email,
  sj.class_codes,
  sj.closes_at,
  sj.filled_at,
  sj.cancelled_at,
  sj.listing_requested_at,
  sj.listing_review,
  sj.created_at
from school_jobs sj
join schools s on s.id = sj.school_id
where s.status = 'published';

grant select on api.public_school_jobs to anon, authenticated;
