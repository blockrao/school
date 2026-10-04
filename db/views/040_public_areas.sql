-- api.public_areas: the city/area directory, built from districts (not the
-- `cities` table — every district now has exactly one `cities` row per the
-- 2026-09-28 city/district merge, so district remains the real area unit
-- and the two stay interchangeable).
--
-- No launch gate (Prav, 30 Sep 2026 — reconfirmed 5 Oct 2026): every
-- area always renders, regardless of published-school count. "If the school
-- data says published, just publish and make it live; if not, it does not
-- show on the UI — that's controlled at the school record level
-- (schools.status, via the ops portal), not here." A city/district with zero
-- published schools just renders an empty state instead of 404ing or
-- dropping out of the sitemap.
--
-- is_launch is kept as a column, hardcoded true, only so any consumer still
-- selecting it doesn't break — it is no longer a gate of any kind. (No app
-- code reads it today; src/lib/db/public-adapter.ts's isLaunch/is_launch
-- fields are dead reads at this point and can be deleted entirely in a
-- follow-up.)
--
-- HISTORY — why this needed reconfirming: this file briefly removed the
-- gate on 29 Sep (commit 872bc06) but that change had a SQL bug (invalid
-- array_agg usage in the city-state branch, fixed in 2d1a87c) that broke
-- every page on the site, so it was reverted (1bcc774) before the syntax fix
-- landed — the syntax fix then landed on top of the REVERTED (gated)
-- version. Separately, a 30 Sep migration (remove_launch_gate_entirely,
-- supabase_migrations.schema_migrations version 20260930092048) re-removed
-- the gate directly against the live database, bypassing this file — so the
-- live view was correct for a while, until a later `pnpm db:views --confirm`
-- run re-applied this file (still gated) and silently reverted the live fix
-- again. Found 5 Oct 2026 while auditing the untracked-migration ledger:
-- this file and the live view had drifted, with this file the stale one.
-- This version is the first time the no-gate decision and the syntax fix
-- have both actually landed in the same place.
--
-- Must stay owner-run (schools has RLS; see 010_public_schools.sql's header
-- — this view reads api.public_schools, which carries the same requirement).
--
-- NOTE: this view is still district-sourced (slug/name below are the
-- district's). It reads identically to the city today because every city's
-- name_en/slug was generated 1:1 from its district (see
-- docs/archive/2026-09/architecture-baseline.md's city/district merge note)
-- — flagged as a follow-up to fold into a city-based area view if that 1:1
-- mapping ever stops holding.
create or replace view api.public_areas as
-- One row per area. Ordinary states: one area per district (D-116).
-- City-states (states.is_city_state, D-126): one area for the whole state,
-- slug = state slug, covering all its districts (district_ids).
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
      array(select d2.id from districts d2 where d2.state_id = st.id)
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
