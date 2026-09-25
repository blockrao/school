-- Locality enrichment schema, for seeding from the JaipurCircle CSV export (see
-- docs/city-mapping-seed.md). Additive only: new columns (nullable/defaulted) and
-- new tables. Nothing existing is altered in a breaking way, nothing is dropped.

alter table public.localities
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists parent_locality_id integer references public.localities(id),
  add column if not exists status text not null default 'active',
  add column if not exists source text,
  add column if not exists external_ref text,
  -- name_hi_status: 'needs_review' for anything machine-generated or otherwise
  -- unverified. The app must not present name_hi as authoritative until this is
  -- 'verified' by a human.
  add column if not exists name_hi_status text not null default 'unverified',
  -- Set when this locality row has been superseded by a corridors row (roads
  -- reclassified out of localities) — the row is kept, not deleted, but the app
  -- should treat it as legacy/redirect-only once this is set.
  add column if not exists superseded_by_corridor_id bigint;

-- Normalized pincode join, replacing the inline `pincodes text[]` column as the
-- write target going forward (the old column is untouched — not dropped, not
-- backfilled from it here; this seed's pincodes come from a different, newer
-- source than whatever originally populated the old column).
create table if not exists public.locality_pincodes (
  locality_id integer not null references public.localities(id) on delete cascade,
  pincode text not null,
  primary key (locality_id, pincode)
);

-- Adjacency. `method` distinguishes curated ('source', from the CSV's own
-- nearby_localities field) from inferred ('computed', centroid distance <=3km,
-- only used where no source data exists for that locality) — never blended
-- silently into one number.
create table if not exists public.locality_neighbors (
  locality_id integer not null references public.localities(id) on delete cascade,
  neighbor_locality_id integer not null references public.localities(id) on delete cascade,
  distance_meters numeric,
  method text not null,
  primary key (locality_id, neighbor_locality_id),
  check (locality_id <> neighbor_locality_id)
);

-- For "schools near X" queries.
create table if not exists public.landmarks (
  id bigserial primary key,
  locality_id integer references public.localities(id) on delete cascade,
  name text not null,
  type text
);

-- Roads/corridors, kept distinct from localities per instruction. `aliases` holds
-- each corridor's prior locality-table slug(s) — e.g. the old
-- '200ft-bypass-ajmer-road' locality slug becomes an alias of the new
-- '200ft-bypass' corridor, folding in that naming inconsistency.
create table if not exists public.corridors (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  aliases text[] not null default '{}'::text[],
  centroid geography(Point, 4326)
);

-- Postgres has no "ADD CONSTRAINT IF NOT EXISTS" — check pg_constraint instead.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'localities_superseded_by_corridor_id_fkey'
  ) then
    alter table public.localities
      add constraint localities_superseded_by_corridor_id_fkey
      foreign key (superseded_by_corridor_id) references public.corridors(id);
  end if;
end $$;

create table if not exists public.locality_corridors (
  locality_id integer not null references public.localities(id) on delete cascade,
  corridor_id bigint not null references public.corridors(id) on delete cascade,
  primary key (locality_id, corridor_id)
);
