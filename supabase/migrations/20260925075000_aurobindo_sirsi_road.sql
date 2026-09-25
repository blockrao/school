-- Aurobindo International School: staff judgement call, per explicit instruction.
-- Catalog search (aliases, micro_localities, landmarks) found nothing tying
-- "Sirsi Road" or "Royal Greens" to any existing locality — falls through to
-- the instructed default, Jhotwara (id 18).

-- corridors gets the same name_hi/name_hi_status pattern localities already has.
alter table public.corridors
  add column if not exists name_hi text,
  add column if not exists name_hi_status text not null default 'unverified';

-- Schools aren't otherwise linked to a corridor (locality_id is the routing/
-- page-scoping field) — this is a descriptive "school sits on this road" fact,
-- distinct from and additional to the locality assignment below.
alter table public.schools
  add column if not exists corridor_id bigint references public.corridors(id);

-- Assignment provenance, so a locality_id set by staff judgement (vs. address/
-- pincode/town evidence) is visibly distinguishable and easy to revisit later.
alter table public.schools
  add column if not exists locality_assignment_method text,
  add column if not exists locality_assignment_note text;

insert into public.corridors (name, slug, aliases, centroid, name_hi, name_hi_status)
values (
  'Sirsi Road',
  'sirsi-road',
  '{}'::text[],
  ST_SetSRID(ST_MakePoint(75.7567, 26.9456), 4326)::geography,
  'सिरसी रोड',
  'needs_review'
)
on conflict (slug) do update set centroid = excluded.centroid;

update public.schools
set
  corridor_id = (select id from public.corridors where slug = 'sirsi-road'),
  city_id = 1,
  locality_id = 18, -- Jhotwara: no catalog match for Sirsi Road/Royal Greens, instructed fallback
  locality_assignment_method = 'staff',
  locality_assignment_note = 'judgement: Sirsi Road address, assigned by catalog/nearest'
where id = '8e9771ac-ebee-4552-94ab-96c7b1a1384c'; -- Aurobindo International School
