-- api.public_schools: display-safe school records for the public site.
--
-- Publishing rule per fact-bearing column: shown only if at least one
-- field_provenance row for that (school, field) traces to an allowed source.
--   OFFICIAL (government/board lists + SchoolOye's own first-party verification):
--     1 school_portal, 2 ops_call, 4 saras, 6 rajpsp, 7 delhi_doe, 8 haryana_edu,
--     9 cisce, 11 saras_archive, 12 haryana_edu_2026_ext
--   CONTACT fields (phone/email/website) additionally allow:
--     3 school_website (a matched school's own site)
--   Never allowed for anything: 5 udise (explicit rule — UDISE-sourced fields,
--   including the UDISE code itself, are never shown), 10 parent_report (not an
--   official or school-matched source), 13 jaipurcircle_localities (sister-project
--   sync, not this state's government/board data).
--
-- A field with no qualifying provenance renders null here — the app's fallback
-- ("Not yet published") takes over, same as any other unknown fact.
--
-- Only status = 'published' schools appear at all.
create or replace view api.public_schools as
select
  s.id,
  s.slug,
  s.district_id,
  s.city_id,
  s.locality_id,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'name_en'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.name_en else null end as name_en,
  s.name_hi,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'management'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.management else null end as management,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'gender'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.gender else null end as gender,
  s.medium,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'min_class'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.min_class else null end as min_class,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'max_class'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.max_class else null end as max_class,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'address'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.address else null end as address,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'pincode'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.pincode else null end as pincode,
  case when s.location is not null then ST_Y(s.location::geometry) else null end as lat,
  case when s.location is not null then ST_X(s.location::geometry) else null end as lng,
  s.geocode_precision,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'website'
      and fp.source_id in (1, 2, 3, 4, 6, 7, 8, 9, 11, 12)
  ) then s.website else null end as website,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'phone'
      and fp.source_id in (1, 2, 3, 4, 6, 7, 8, 9, 11, 12)
  ) then s.phone else null end as phone,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'email'
      and fp.source_id in (1, 2, 3, 4, 6, 7, 8, 9, 11, 12)
  ) then s.email else null end as email,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'established_year'
      and fp.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12)
  ) then s.established_year else null end as established_year,
  s.tier,
  s.verification,
  s.claim,
  s.last_verified_at,
  s.about_en,
  s.about_hi
from schools s
where s.status = 'published';
