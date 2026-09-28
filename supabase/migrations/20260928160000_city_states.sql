-- City-states (D-126, Prav 28 Sep 2026): from a parent's point of view Delhi is one
-- city like Gurugram, not nine districts. A state flagged is_city_state is served as
-- a single city whose slug is the state slug (/schools/delhi); its districts never
-- appear in a URL (D-041). Views: db/views/010_public_schools.sql (city_slug) and
-- db/views/040_public_areas.sql (one area row per city-state).
alter table public.states add column if not exists is_city_state boolean not null default false;
update public.states set is_city_state = true where slug = 'delhi';
