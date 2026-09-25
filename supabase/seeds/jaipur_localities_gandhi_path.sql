-- Follow-up: Gandhi Path West reclassified as a corridor, same treatment as
-- Ajmer/Tonk/Amer/Agra/Delhi Road and 200 ft Bypass (see docs/city-mapping-seed.md).
-- Idempotent, no explicit begin/commit (scripts/db-migrate.mjs wraps this already —
-- see the fix note at the top of jaipur_localities.sql for why that matters).

insert into public.corridors (name, slug, aliases, centroid)
values (
  'Gandhi Path',
  'gandhi-path',
  ARRAY['gandhi-path-west']::text[],
  ST_SetSRID(ST_MakePoint(75.7312, 26.9198), 4326)::geography
)
on conflict (slug) do update set centroid = excluded.centroid, aliases = excluded.aliases;

update public.localities set
  superseded_by_corridor_id = (select id from public.corridors where slug = 'gandhi-path')
where slug = 'gandhi-path-west'
  and city_id = (select id from public.cities where slug = 'jaipur');
