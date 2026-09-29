-- api.public_jobs: the SITE-WIDE /jobs aggregator feed (29 Sep 2026,
-- 20260929060000_school_jobs.sql). A school job only appears here once the
-- school has requested a listing AND ops has approved it
-- (`listing_review = 'approved'`) — the school's own-page feed
-- (104_public_school_jobs.sql) has no such gate. Filled/cancelled jobs are
-- excluded from the active aggregator (the canonical page itself still
-- resolves and shows the real status) — nobody should apply to a job that's
-- no longer open. Open/Closed is derived from closes_at at render time
-- (mirrors deadlineState()/eventTemporalStatus()), never stored here.
create or replace view api.public_jobs as
select
  sj.id,
  sj.school_id,
  s.slug as school_slug,
  s.name_en as school_name,
  s.city_id,
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
  sj.closes_at,
  sj.created_at,
  sj.listing_reviewed_at
from school_jobs sj
join schools s on s.id = sj.school_id
where sj.listing_review = 'approved'
  and sj.filled_at is null
  and sj.cancelled_at is null
  and s.status = 'published';

grant select on api.public_jobs to anon, authenticated;
