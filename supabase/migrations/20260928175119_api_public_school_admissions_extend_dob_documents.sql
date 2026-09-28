-- Increment 10: extend api.public_school_admissions with dob_from, dob_to,
-- documents_required for the eligibility-checker / admissions-deepening UI.
-- See db/views/020_public_school_admissions.sql for the full current definition and
-- header comment (including the Postgres column-order constraint this ran into).
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
  case when ac.closes_on is not null then ac.closes_on - current_date else null end as days_to_close,
  ac.dob_from,
  ac.dob_to,
  ac.documents_required
from schools s
join admission_cycles ac on ac.school_id = s.id
where s.status = 'published';
