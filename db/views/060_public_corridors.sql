-- api.public_corridors: roads/corridors (Ajmer Road, Tonk Road, etc.) kept
-- distinct from localities per docs/city-mapping-seed.md. No schools are
-- assigned to a corridor directly today (locality_corridors is unpopulated) —
-- this view exists so corridor names/slugs are available wherever a locality
-- or landmark description references one, without a second, ad hoc query.
create or replace view api.public_corridors as
select
  co.id,
  co.slug,
  co.name,
  case when co.centroid is not null then ST_Y(co.centroid::geometry) else null end as lat,
  case when co.centroid is not null then ST_X(co.centroid::geometry) else null end as lng
from corridors co;
