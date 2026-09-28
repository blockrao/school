-- api.public_corridors: roads/corridors (Ajmer Road, Tonk Road, etc.) kept
-- distinct from localities per docs/archive/2026-09/city-mapping-seed.md. No schools are
-- assigned to a corridor directly today (locality_corridors is unpopulated) —
-- this view exists so corridor names/slugs are available wherever a locality
-- or landmark description references one, without a second, ad hoc query.
-- co.id stays bigint (corridors.id's real type) — CREATE OR REPLACE VIEW cannot
-- change a column's type, and db-views.mjs now DROP VIEW IF EXISTS's first, so
-- changing it here isn't even structurally blocked anymore, but there's no reason
-- to: PostgREST/supabase-js return bigint as a numeric string (JS can't safely
-- represent int8 as number), so the Zod contract uses z.coerce.number() instead of
-- casting the column down — see src/contracts/public-corridors.ts.
create or replace view api.public_corridors as
select
  co.id,
  co.slug,
  co.name,
  case when co.centroid is not null then ST_Y(co.centroid::geometry) else null end as lat,
  case when co.centroid is not null then ST_X(co.centroid::geometry) else null end as lng
from corridors co;
