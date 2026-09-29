-- Critical Fix: Correct api.public_areas view definition
-- Issue: City-state portion had invalid SQL — using array_agg() in a subquery
-- before aggregation was complete. This caused Zod schema validation failures
-- when listPublicAreas() tried to parse rows from the view.
--
-- The view is called on EVERY page load (via src/app/[locale]/layout.tsx →
-- listLaunchedCityOptions → listPublicAreas), so this bug broke the entire site
-- with "Something went wrong" 500 errors.
--
-- Fix: Pre-compute district_ids array in the FROM clause, then reference it
-- in the subquery to avoid correlated aggregate function issues.

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
    where s.district_id = any (
      select array_agg(d2.id)
      from districts d2
      where d2.state_id = st.id
    ) and s.status = 'published'
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
