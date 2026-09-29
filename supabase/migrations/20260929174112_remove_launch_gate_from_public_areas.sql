-- Launch gate removed (2026-09-29): all areas are now always launched, regardless of school count.
-- This migration updates api.public_areas view to always set is_launch=true for all districts
-- and city-states, allowing the platform to show school discovery pages for all areas.
--
-- api.public_areas: area directory, built from districts (not the `cities` table — `cities.is_launch`
-- only covers Jaipur/Gurugram today; every district now has exactly one `cities` row per the
-- 2026-09-28 city/district merge, so district remains the real launch unit and the two stay
-- interchangeable).
--
-- is_launch always = true: all districts and city-states render regardless of published school count.
-- This allows the platform to show school discovery pages for all areas, even if not all schools
-- are published yet.
--
-- Must stay owner-run (schools has RLS; see views/010_public_schools.sql's header —
-- this view reads api.public_schools, which carries the same requirement).

create or replace view api.public_areas as
-- One row per city. Ordinary states: one area per district (D-116).
-- City-states (states.is_city_state, D-126): one area for the whole state, slug =
-- state slug, covering all its districts (district_ids).
-- All areas have is_launch = true (gate removed 2026-09-29).
select
  d.slug,
  initcap(d.name_en) as name,
  st.name_en as state,
  (
    select count(*)::int from schools s
    where s.district_id = d.id and s.status = 'published'
  ) as school_count,
  true as is_launch,
  d.id as district_id,
  st.slug as state_slug,
  array[d.id] as district_ids,
  false as is_city_state
from districts d
join states st on st.id = d.state_id
where not st.is_city_state
union all
select
  st.slug,
  st.name_en,
  st.name_en,
  (
    select count(*)::int from schools s
    where s.district_id = any (array_agg(d.id)) and s.status = 'published'
  ),
  true,
  min(d.id),
  st.slug,
  array_agg(d.id order by d.id),
  true
from states st
join districts d on d.state_id = st.id
where st.is_city_state
group by st.id, st.slug, st.name_en;
