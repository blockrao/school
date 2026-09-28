-- D-119 (28 Sep 2026): every admission cycle of a published school is shown as stored;
-- `verification` is exposed so the page can label it. No verification filter.
-- api.public_school_admissions: admission cycles, shown only once a human (staff or
-- the school itself) has confirmed them — not merely source_verified from an
-- automated extraction. "Approved" = verification in ('ops_verified','school_verified').
-- Column shape matches the pre-existing public.public_school_admissions view; this
-- adds the approval gate and moves it into the api schema.
--
-- Does not filter on schools.status — see 010_public_schools.sql's header for
-- why (status is an unused manual toggle, not the real publishing gate).
-- Must stay owner-run (same note applies).
create or replace view api.public_school_admissions as
select
  s.id as school_id,
  s.slug,
  s.city_id,
  s.name_en,
  s.name_hi,
  s.tier,
  ac.academic_year,
  ac.class_code,
  ac.status,
  ac.form_mode,
  ac.opens_on,
  ac.closes_on,
  ac.registration_fee,
  ac.form_url,
  ac.last_checked_at,
  ac.verification,
  case when ac.closes_on is not null then ac.closes_on - current_date else null end as days_to_close
from schools s
join admission_cycles ac on ac.school_id = s.id
where s.status = 'published';
