-- api.public_localities: locality + town directory for a launched city.
--
-- Includes both real city neighbourhoods (JaipurCircle-sourced) and the small
-- set of Jaipur-district towns added by the school-assignment seed (Dudu,
-- Tunga, Bassi, Kishangarh-Renwal, Chomu) — `is_town` distinguishes them so
-- the app can route to a town page template instead of a locality page
-- template. That list lives here, in this repo's SQL, same pattern as
-- public_areas' is_launch list — keep it in sync with any equivalent constant
-- in src/lib/db/public-adapter.ts.
--
-- name_hi is only shown once a human has verified it (name_hi_status =
-- 'verified') — everything seeded this session is 'needs_review' and renders
-- null here on purpose; the app's Hindi fallback takes over, same as any
-- other unverified fact.
--
-- Internal operational fields (zone, ward_number, ward_name, character_tags,
-- enrichment_source) are not exposed — nothing here needs them and they were
-- captured for future ops/analysis use, not the public site.
--
-- superseded_by_corridor_id rows (roads that used to be modeled as
-- localities) are excluded entirely — api.public_corridors is now their
-- canonical home.
--
-- Does not filter school_count on schools.status — see 010_public_schools.sql's
-- header for why. Must stay owner-run (same note applies).
create or replace view api.public_localities as
select
  l.id,
  l.slug,
  l.name_en as name,
  case when l.name_hi_status = 'verified' then l.name_hi else null end as name_hi,
  c.slug as city_slug,
  pl.slug as parent_locality_slug,
  l.slug in ('dudu', 'tunga', 'bassi', 'kishangarh-renwal', 'chomu') as is_town,
  case when l.centroid is not null then ST_Y(l.centroid::geometry) else null end as lat,
  case when l.centroid is not null then ST_X(l.centroid::geometry) else null end as lng,
  (
    select count(*)::int from schools s
    where s.locality_id = l.id
  ) as school_count
from localities l
join cities c on c.id = l.city_id
left join localities pl on pl.id = l.parent_locality_id
where l.status = 'active' and l.superseded_by_corridor_id is null;
