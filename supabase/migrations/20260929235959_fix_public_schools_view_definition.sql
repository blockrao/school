-- Fix: Ensure api.public_schools view has correct definition with all UDISE fields
-- Applied after database state validation (29 Sep 2026, ~23:50 IST)
--
-- The view definition in the database may have diverged from db/views/010_public_schools.sql.
-- This migration re-applies the canonical view definition to ensure production matches source.

create or replace view api.public_schools as
select
  s.id,
  s.school_code,
  s.slug,
  s.district_id,
  s.city_id,
  s.locality_id,
  l.slug as locality_slug,
  l.name_en as locality_name,
  l.slug in ('dudu', 'tunga', 'bassi', 'kishangarh-renwal', 'chomu') as locality_is_town,
  s.name_en,
  s.name_hi,
  s.management,
  s.gender,
  s.medium,
  s.min_class,
  s.max_class,
  s.address,
  s.pincode,
  case when s.location is not null then ST_Y(s.location::geometry) else null end as lat,
  case when s.location is not null then ST_X(s.location::geometry) else null end as lng,
  s.geocode_precision,
  s.website,
  s.phone,
  s.email,
  s.established_year,
  s.tier,
  s.verification,
  s.claim,
  s.last_verified_at,
  s.about_en,
  s.about_hi,
  s.status::text as status,
  s.aliases,
  s.udise_code,
  s.principal_name,
  s.address_street,
  s.address_area,
  s.address_city,
  s.address_district,
  s.address_state,
  s.address_state_code,
  s.address_pincode,
  s.address_source,
  st.slug as state_slug,
  case when st.is_city_state then st.slug else d.slug end as city_slug
from schools s
left join localities l on l.id = s.locality_id
left join districts d on d.id = s.district_id
left join states st on st.id = d.state_id
where s.status in ('published', 'closed') and s.merged_into is null;
