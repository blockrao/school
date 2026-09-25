-- Public data must be visible to signed-in users too (a logged-in parent browsing
-- schools still needs to see them) — grants don't cascade from anon to authenticated
-- in Postgres, so both need an explicit grant. Nothing else in schema api is granted.
grant usage on schema api to anon, authenticated;
grant select on api.public_schools to anon, authenticated;
grant select on api.public_school_admissions to anon, authenticated;
grant select on api.public_seat_status to anon, authenticated;
grant select on api.public_areas to anon, authenticated;
grant select on api.public_localities to anon, authenticated;
grant select on api.public_corridors to anon, authenticated;
grant select on api.public_locality_neighbors to anon, authenticated;
