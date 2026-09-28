-- api.public_schools: display-safe school records for the public site.
--
-- Publishing rule per fact-bearing column: shown only if at least one
-- field_provenance row for that (school, field) traces to an allowed source.
--   DIRECTORY fields (name, address, pincode, management, gender, class range,
--   established year) — MVP rule D-115, with D-082 for UDISE+:
--     1 school_portal, 2 ops_call, 3 school_website, 4 saras, 5 udise (directory
--     facts only, lowest official rank), 6 rajpsp, 7 delhi_doe, 8 haryana_edu,
--     9 cisce, 11 saras_archive, 12 haryana_edu_2026_ext, 17 ops_web_verified
--   CONTACT fields (phone/email/website): the same list WITHOUT 5 udise
--     (UDISE contacts only under sources.licence_note conditions, D-082).
--   Never allowed: 10 parent_report, 13 jaipurcircle_localities, 14 geonames,
--   16 ai_web_research, 18 cforerankings. The UDISE code itself is never shown.
--
-- A field with no qualifying provenance renders null here — the app's fallback
-- ("Not yet published") takes over, same as any other unknown fact.
--
-- school_code: stable 6-digit numeric entity id (schools.school_code, unique
-- NOT NULL, backfilled — see docs/spec/school-entity-page.md). Not source-gated
-- like the fact columns above — it's an internal identifier, not a published
-- fact about the school — and it's never guessed/omitted like UDISE. Used as
-- the canonical URL suffix (/[city]/[slug]-[school_code]) and as the
-- "SchoolOye School ID" PropertyValue in JSON-LD, so the app can resolve a
-- school by a stable id even if its slug text is later corrected.
--
-- Does NOT filter on schools.status. That field is an unused manual toggle —
-- every school in the database is 'draft' (confirmed: 0 rows are 'published'
-- anywhere, in any district). "Published" here means the L0-L3 completeness
-- rules (docs/spec/data-and-trust.md) plus the source rules above (both computed from
-- the row's own fields), not a status flag nobody sets.
--
-- This view must stay owner-run: created via DATABASE_URL (role `postgres`,
-- rolbypassrls=true), so it executes with the view owner's privileges, not
-- the querying anon/authenticated role's. schools has RLS enabled with a
-- policy restricting direct table reads to status='published' OR staff OR
-- the school's own member — if this view were ever re-created by a role
-- without BYPASSRLS, or with `security_invoker=true` explicitly set (neither
-- is the case here — default view semantics apply), that base-table policy
-- would silently start hiding rows again despite this file having no status
-- filter of its own. Re-verify `select rolbypassrls from pg_roles where
-- rolname = current_user` is true whenever this file is (re)applied.
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
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'name_en'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.name_en else null end as name_en,
  s.name_hi,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'management'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.management else null end as management,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'gender'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.gender else null end as gender,
  s.medium,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'min_class'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.min_class else null end as min_class,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'max_class'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.max_class else null end as max_class,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'address'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.address else null end as address,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'pincode'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.pincode else null end as pincode,
  case when s.location is not null then ST_Y(s.location::geometry) else null end as lat,
  case when s.location is not null then ST_X(s.location::geometry) else null end as lng,
  s.geocode_precision,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'website'
      and fp.source_id in (1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 17)
  ) then s.website else null end as website,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'phone'
      and fp.source_id in (1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 17)
  ) then s.phone else null end as phone,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'email'
      and fp.source_id in (1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 17)
  ) then s.email else null end as email,
  case when exists (
    select 1 from field_provenance fp
    where fp.entity_table = 'schools' and fp.entity_id = s.id and fp.field = 'established_year'
      and fp.source_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17)
  ) then s.established_year else null end as established_year,
  s.tier,
  s.verification,
  s.claim,
  s.last_verified_at,
  s.about_en,
  s.about_hi
from schools s
left join localities l on l.id = s.locality_id;
