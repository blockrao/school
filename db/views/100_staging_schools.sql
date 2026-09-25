-- staging.schools_with_level: every school (any status), with the completeness
-- level used to decide whether/how a public page renders. Analysis-only — never
-- queried by the Next.js app; only by claude_ro, for reporting (see scripts/*.mjs).
--   L0: no page yet (missing address or pincode)
--   L1: page renders with "Details being verified", noindex (has address+pincode,
--       missing phone/website+coordinates)
--   L2: full page, indexable (+ phone or website, + coordinates)
--   L3: full page with admissions shown (+ an approved admission cycle)
create or replace view staging.schools_with_level as
select
  s.id,
  s.slug,
  s.name_en,
  s.district_id,
  s.city_id,
  s.status,
  case
    when not (s.address is not null and s.pincode is not null) then 'L0'
    when not (
      (s.phone is not null or s.website is not null) and s.location is not null
    ) then 'L1'
    when not exists (
      select 1 from admission_cycles ac
      where ac.school_id = s.id and ac.verification in ('ops_verified', 'school_verified')
    ) then 'L2'
    else 'L3'
  end as completeness_level
from schools s;
