-- api.public_schools: the public site's school records.
--
-- Rule (Prav, 28 Sep 2026, D-119): a school is public when schools.status =
-- 'published'. Every column is shown exactly as stored in the table — no
-- per-field source filtering (the earlier field_provenance allow-list, incl.
-- the UDISE+ blocks, is removed). Source/date lines on the page still come
-- from field_provenance, for display only.
--
-- school_code: stable 6-digit public id, canonical URL suffix
-- (/[city]/[slug]-[school_code]) and the "SchoolOye School ID" in JSON-LD.
--
-- Must stay owner-run (created as `postgres`, rolbypassrls = true): the schools
-- table's RLS would otherwise hide rows from anon.
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
  s.about_hi
from schools s
left join localities l on l.id = s.locality_id
where s.status = 'published';
