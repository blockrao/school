-- api.public_featured_placements: paid listing placements for the school
-- search/listing pages (city admissions/search UI, docs/spec/... school
-- search redesign, 30 Sep 2026). featured_placements has no rows yet —
-- Prav has no sponsored inventory today, this is provision for when he
-- starts approaching schools for marketing (not before 1 Dec per
-- docs/spec/admissions-tracker.md T-6/D-089) — so this view and its adapter
-- caller must degrade to "no sponsored cards" cleanly, never invent one.
--
-- Joins through api.public_schools (not the raw `schools` table), same
-- reasoning as public_school_rankings: a placement whose school isn't
-- status='published' or fails trust redaction drops out here rather than a
-- sponsored card ever showing untrusted/unpublished school data.
--
-- Window filter (CURRENT_DATE between starts_on and ends_on) is applied
-- here, not left to the caller, so this view can never be misread as "every
-- placement ever bought" — anon/authenticated only ever see what's live
-- today. featured_placements' own RLS (featured_placements_select) already
-- enforces the same window for direct table access, but anon/authenticated
-- have no raw grant on that table at all (20260925093232_revoke_excess_
-- grants.sql) — every public-facing read goes through api.* views, this is
-- that view. `order_ref` (the internal sales-order link) is deliberately
-- not exposed here — it's an ops/sales concern, not a display fact.
create or replace view api.public_featured_placements as
select
  fp.id,
  fp.placement,
  fp.class_codes,
  fp.label,
  fp.starts_on,
  fp.ends_on,
  ps.id as school_id,
  ps.slug,
  ps.school_code,
  ps.name_en,
  c.slug as city_slug
from featured_placements fp
join api.public_schools ps on ps.id = fp.school_id
join api.public_cities c on c.id = fp.city_id
where current_date between fp.starts_on and fp.ends_on
order by fp.created_at;

grant select on api.public_featured_placements to anon, authenticated;
