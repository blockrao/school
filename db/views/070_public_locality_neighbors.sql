-- api.public_locality_neighbors: adjacency pairs for a locality page's
-- "Nearby" section. `method` is passed through as-is ('source' = curated from
-- the JaipurCircle export, 'computed' = centroid-distance fallback for the 2
-- localities with no source data) so the app can label computed neighbours
-- differently if it chooses to, rather than presenting both as equally
-- authoritative.
-- distance_meters::double precision cast: locality_neighbors.distance_meters is
-- numeric, which PostgREST/supabase-js return as a string — meter-precision
-- distance has no real use for numeric's extra precision, so cast down in the
-- view. db-views.mjs DROP VIEW IF EXISTS's before every CREATE, so this (and any
-- future column-type edit) applies cleanly. The Zod contract also uses
-- z.coerce.number() as a defensive second layer either way.
create or replace view api.public_locality_neighbors as
select
  l.slug as locality_slug,
  n.slug as neighbor_slug,
  n.name_en as neighbor_name,
  ln.distance_meters::double precision as distance_meters,
  ln.method
from locality_neighbors ln
join localities l on l.id = ln.locality_id
join localities n on n.id = ln.neighbor_locality_id
where l.status = 'active' and l.superseded_by_corridor_id is null
  and n.status = 'active' and n.superseded_by_corridor_id is null;
