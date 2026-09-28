-- D-119 (28 Sep 2026): a district is launched when it has at least one published school.
-- api.public_areas: launch-area directory, built from districts (not the `cities`
-- table — `cities.is_launch` only covers Jaipur/Gurugram today; every district now
-- has exactly one `cities` row per the 2026-09-28 city/district merge, so district
-- remains the real launch unit and the two stay interchangeable).
--
-- is_launch policy (D-119, 2026-09-28): a district is "supported" when it has at
-- least one school with schools.status = 'published' — computed by checking
-- api.public_schools (010_public_schools.sql), which is exactly that filter, so a
-- district only drops in or out of launch as schools are published/unpublished,
-- with nothing here to keep manually in sync.
--
-- Previously: a hardcoded `d.slug in ('jaipur', 'gurugram')` list, kept in sync by
-- hand with LAUNCH_DISTRICT_SLUGS in src/lib/db/public-adapter.ts. That constant is
-- now gone — getPublicCityAreaBySlug/getPublicTownAreaBySlug read is_launch from
-- this view directly instead of maintaining a parallel list.
--
-- Must stay owner-run (schools has RLS; see 010_public_schools.sql's header —
-- this view reads api.public_schools, which carries the same requirement).
--
-- NOTE: this view is still district-sourced (slug/name below are the district's).
-- It reads identically to the city today because every city's name_en/slug was
-- generated 1:1 from its district (see docs/archive/2026-09/architecture-baseline.md's city/district
-- merge note) — flagged as a follow-up to fold into a city-based area view if that
-- 1:1 mapping ever stops holding, not done in this pass since the app doesn't route
-- on district (src/app/[locale]/[state]/[city]/) and this view's output isn't
-- currently wrong for any area.
create or replace view api.public_areas as
select
  d.slug,
  initcap(d.name_en) as name,
  st.name_en as state,
  (
    select count(*)::int from schools s
    where s.district_id = d.id and s.status = 'published'
  ) as school_count,
  exists (
    select 1 from api.public_schools ps
    where ps.district_id = d.id
  ) as is_launch,
  d.id as district_id,
  st.slug as state_slug
from districts d
join states st on st.id = d.state_id;
