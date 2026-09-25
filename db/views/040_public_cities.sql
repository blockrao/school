-- api.public_cities: only cities flagged launch-ready. Today that's Jaipur alone —
-- South West Delhi (this repo's current MVP build district) has no `cities` row at
-- all yet. Geo centroid is omitted; no map feature consumes it yet.
create or replace view api.public_cities as
select
  c.id,
  c.district_id,
  c.name_en,
  c.name_hi,
  c.slug
from cities c
where c.is_launch = true;
