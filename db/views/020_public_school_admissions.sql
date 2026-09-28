-- D-119 (Prav, 28 Sep 2026): every admission cycle of a published school is shown
-- exactly as stored, matching 010_public_schools.sql's current rule. `verification`
-- is exposed so the page can label the record, but it gates nothing here — the
-- older per-field approval gate ("Approved" = verification in ('ops_verified',
-- 'school_verified'), formerly D-025) is suspended along with the rest of
-- data-and-trust.md §3's rules 1–5 (see that file for the full list and for how
-- to reinstate gating if D-119 is ever reversed).
--
-- Filters on schools.status = 'published' (the real publishing gate under D-119,
-- same as 010_public_schools.sql) via the join below.
-- Column shape matches the pre-existing public.public_school_admissions view; this
-- moved it into the api schema.
-- Must stay owner-run — see 010_public_schools.sql's header.
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
