-- api.public_school_rankings: third-party award/ranking placements, for
-- editorial pages (e.g. "Top schools in Jaipur" articles) — not used by the
-- core school directory/search. Joins through api.public_schools (not the
-- raw `schools` table) so a ranked school still respects the publish gate
-- and per-field trust redaction; a school that isn't status='published' or
-- has an untrusted name simply drops out of this view rather than leaking
-- through a side door. city_slug comes from api.public_cities (pure
-- reference data, no redaction rules — see 045_reference_views.sql).
create or replace view api.public_school_rankings as
select
  sr.category,
  sr.rank,
  sr.score,
  sr.year,
  ps.id,
  ps.slug,
  ps.school_code,
  ps.name_en,
  ps.locality_name,
  c.slug as city_slug
from school_rankings sr
join api.public_schools ps on ps.id = sr.school_id
join api.public_cities c on c.id = ps.city_id
order by sr.category, sr.rank;

grant select on api.public_school_rankings to anon, authenticated;
