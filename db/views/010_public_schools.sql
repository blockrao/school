-- api.public_schools: the public site's school records.
--
-- Rule (Prav, 28 Sep 2026, D-119): a school is public when schools.status =
-- 'published'; 'closed' schools stay public with a banner (D-121 §9). Merged
-- schools (merged_into set) are excluded — api.public_school_redirects sends them
-- to the survivor. Every column is shown exactly as stored in the table — no
-- per-field source filtering (the earlier field_provenance allow-list, incl.
-- the UDISE+ blocks, is removed). Source/date lines on the page still come
-- from field_provenance, for display only.
--
-- school_code: internal 6-digit id (D-121: never in a URL or JSON-LD).
-- slug: the permanent public locator, minted once and write-once (see
-- supabase/migrations/20260928120000_canonical_school_slugs.sql).
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
  s.about_hi,
  s.status::text as status,
  s.aliases,
  -- Identity & Search Presence Foundation v1 (29 Sep 2026, see
  -- supabase/migrations/20260929100000_school_udise_identity.sql): UDISE+
  -- school code, the one stable external identifier most of the corpus
  -- actually has (CBSE affiliation only covers ~4% of schools; UDISE+ covers
  -- most of it). A real column, not routed through field_provenance, same
  -- reasoning as that migration's header comment.
  s.udise_code,
  -- UDISE Enrichment (29 Sep 2026, see supabase/migrations/20260929120000_udise_enrichment_schema.sql):
  -- Principal name, structured address components, and audit trail for enriched school data.
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
  -- City-states (D-126): the city is the state itself (e.g. delhi), never a district.
  case when st.is_city_state then st.slug else d.slug end as city_slug
from schools s
left join localities l on l.id = s.locality_id
left join districts d on d.id = s.district_id
left join states st on st.id = d.state_id
where s.status in ('published', 'closed') and s.merged_into is null;
