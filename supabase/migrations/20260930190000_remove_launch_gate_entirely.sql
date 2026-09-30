-- Remove the launch gate entirely (Prav, 30 Sep 2026): "if the school data
-- says published, just publish and make it live; if not, it does not show
-- on the UI, simple, and this is controlled by the admin ops portal."
--
-- History: migration 20260929174112_remove_launch_gate_from_public_areas.sql
-- already tried this once -- it set api.public_areas.is_launch to a literal
-- `true` for every row. But the *live* view definition (checked via
-- pg_get_viewdef just now) does NOT match that migration file: at some point
-- after 29 Sep it was replaced, outside of a committed migration, with
-- `is_launch = EXISTS (select 1 from api.public_schools where district_id = d.id)`
-- -- i.e. "does this district have >=1 published school" (matches the D-119
-- comments found across src/lib/db/public-adapter.ts). That's a real,
-- data-driven area-level gate, and it's exactly what's been "creating
-- problems often" -- e.g. charkhi-dadri (0 published schools right now)
-- silently drops out of the sitemap index and 404s its own city/locality
-- pages, even though nothing is wrong with its data, it just doesn't have a
-- published school *yet*.
--
-- Fix: restore is_launch = true unconditionally (this migration is the
-- record of that, since the drift between 20260929174112's file and the
-- live view was never itself committed). Every city/state page now always
-- renders regardless of published-school count; the app layer's separate
-- `isLaunch`/`is_launch` gating checks are removed in this same change (see
-- the app-side commit). Visibility lives entirely at the school record
-- level (schools.status = 'published', already controlled by the ops
-- portal at src/app/ops/schools/[id]/actions.ts) -- a city with zero
-- published schools just renders an empty state instead of 404ing.
--
-- Also drops public.cities.is_launch -- a separate, older column on the raw
-- `cities` table (predates the district-based api.public_areas view).
-- Confirmed dead: grepped for any read or write of it anywhere in src/ or
-- scripts/ (including the ops portal) and found none -- api.public_areas
-- never joined to it either. Nothing to migrate off of; just unused.
--
-- Dropping it cascades into public.active_cities, a SECURITY DEFINER view
-- that filtered `where c.is_launch = true` -- the same gate, a second time,
-- on the raw table. Already flagged by the security advisor
-- (security_definer_view) before this session touched it; confirmed dead
-- too (only appears in generated type files, never queried from src/ or
-- scripts/), so this drops it outright rather than rewriting it, which
-- also closes that advisor finding.

create or replace view api.public_areas as
-- One row per city. Ordinary states: one area per district (D-116).
-- City-states (states.is_city_state, D-126): one area for the whole state, slug =
-- state slug, covering all its districts (district_ids).
-- Launch gate removed (30 Sep 2026) -- is_launch is always true. Kept as a
-- column (rather than dropped from the view) so existing consumers that
-- still select it don't break; it's simply no longer meaningful as a gate.
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

drop view if exists public.active_cities;
alter table public.cities drop column if exists is_launch;
