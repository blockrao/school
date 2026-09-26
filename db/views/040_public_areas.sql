-- api.public_areas: launch-area directory, built from districts (not the `cities`
-- table — `cities.is_launch` only covers Jaipur today and has no row at all for
-- South West Delhi, our actual MVP district; districts is the real launch unit).
--
-- The launch list lives HERE, in this repo's SQL — not in any table, and not
-- decided by any flag on `districts` or `cities`. To launch another area, add its
-- slug to the `in (...)` list below. Keep this in sync with LAUNCH_DISTRICT_SLUGS
-- in src/lib/db/public-adapter.ts until this view is applied and the adapter
-- switches to reading it directly.
--
-- Jaipur and Gurugram are the launch districts (Gurugram added for city-picker
-- testing). South West Delhi stays fully built (data, routes, the Delhi Nursery
-- Hub) but unlinked — dropped from is_launch, not deleted, so nothing breaks if
-- Delhi launches later.
-- Does not filter school_count on schools.status — see 010_public_schools.sql's
-- header for why. Must stay owner-run (same note applies).
--
-- NOTE: this view is still district-sourced (slug/name below are the
-- district's). It happens to read identically to the city today because
-- Jaipur's district and city slugs/names match exactly — flagged as a
-- follow-up to fold into a city-based area view, not done in this pass since
-- the app no longer routes on district (src/app/[locale]/[state]/[city]/) and
-- this view's output isn't currently wrong for the one launched area.
create or replace view api.public_areas as
select
  d.slug,
  initcap(d.name_en) as name,
  st.name_en as state,
  (
    select count(*)::int from schools s
    where s.district_id = d.id
  ) as school_count,
  d.slug in ('jaipur', 'gurugram') as is_launch
from districts d
join states st on st.id = d.state_id;
