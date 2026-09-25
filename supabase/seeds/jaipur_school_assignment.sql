-- Jaipur school → city/locality assignment, 38 schools in the Jaipur district
-- (district_id=75). Evidence rules (see docs/city-mapping.md): geocode_precision
-- ='locality' is trusted as-is; 'pincode' precision is cross-checked against
-- locality_pincodes; where neither is trustworthy, address text is used only
-- when it names a locality/town unambiguously and does not contradict other
-- evidence. Two agreeing sources -> resolved. Sources that disagree -> conflict,
-- left unassigned. No usable evidence, or the named place isn't in our locality
-- catalog yet -> unresolved, left unassigned. Both conflict and unresolved rows
-- are simply schools with city_id/locality_id still null under a launched
-- district — that null-locality-under-launched-city set IS the /ops queue until
-- Flow 6.15 builds a real screen on top of it.
--
-- Idempotent: keyed by school id, safe to re-run. No explicit begin/commit
-- (scripts/db-migrate.mjs wraps this already; see jaipur_localities.sql for why
-- a nested transaction silently breaks over Supabase's pooled connection).

-- Five real small towns/tehsils in Jaipur district that are not city
-- neighbourhoods and were not part of the JaipurCircle locality catalog. Added
-- as ordinary localities rows (city_id=1, same table schools.locality_id already
-- points at) so "Near <town>" pages can reuse the same locality page template;
-- app code distinguishes them from city localities via a small hardcoded slug
-- list (same pattern as the is_launch district list), not a new column.
insert into public.localities (city_id, name_en, slug, centroid, source, status)
values
  (1, 'Dudu', 'dudu', ST_SetSRID(ST_MakePoint(75.335925, 26.734025), 4326)::geography, 'school-assignment-manual', 'active'),
  (1, 'Tunga', 'tunga', null, 'school-assignment-manual', 'active'),
  (1, 'Bassi', 'bassi', ST_SetSRID(ST_MakePoint(76.17816, 26.80228), 4326)::geography, 'school-assignment-manual', 'active'),
  (1, 'Kishangarh-Renwal', 'kishangarh-renwal', ST_SetSRID(ST_MakePoint(75.585833, 26.9452), 4326)::geography, 'school-assignment-manual', 'active'),
  (1, 'Chomu', 'chomu', ST_SetSRID(ST_MakePoint(75.69195, 27.165075), 4326)::geography, 'school-assignment-manual', 'active')
on conflict (city_id, slug) do nothing;

-- Resolved: geocode_precision='locality' rows already carry a trustworthy
-- locality_id (set at import time). This just backfills city_id to match.
update public.schools set city_id = 1
where district_id = 75 and geocode_precision = 'locality' and locality_id is not null;

-- Resolved via pincode (pincode found in locality_pincodes, single match).
update public.schools set city_id = 1, locality_id = 49
where id in (
  '2429434e-1823-41dd-b5bb-336f3454a6dc', -- Alpha International Academy, 302034
  'd37bba70-2679-4539-b09f-788cf7b2e5f6', -- B.p. Convent School, 302034
  '36b0ae65-54ad-4b97-afc5-2fc6ea0c7bcf'  -- Yugantar International School, 302034
); -- -> Panchyawala (id 49)

update public.schools set city_id = 1, locality_id = 47
where id = 'f562bef6-3ea1-418f-bc5f-69810d2ba07e'; -- Mahrishi Dayanand Public School, 302005 -> Jyothi Nagar (id 47)

-- Resolved via address text (pincode not in our catalog or absent, but the
-- address names an existing locality unambiguously and no other evidence
-- contradicts it).
update public.schools set city_id = 1, locality_id = 11
where id = 'b0fcefe0-7271-4b72-8805-099654aa85b2'; -- Jayshree Periwal Global School, "SECTOR-36, NRI ROAD, JAGATPURA" -> Jagatpura (id 11)

update public.schools set city_id = 1, locality_id = 19
where id = 'd5bb1806-9472-4a93-ba90-2413493865b1'; -- Saint Soldier Public School, "SEC.8, PRATAP NAGAR" -> Pratap Nagar (id 19)

-- Resolved as "Near <town>" (address confirms a real Jaipur-district town not
-- in the city locality catalog; page renders as a town page, not a locality
-- page).
update public.schools set city_id = 1, locality_id = (select id from public.localities where slug = 'dudu' and city_id = 1)
where id = '4d83377e-f9be-47e5-b917-df72740cce4c'; -- Bombay World School, Dudu

update public.schools set city_id = 1, locality_id = (select id from public.localities where slug = 'tunga' and city_id = 1)
where id = 'd3fed285-e920-4eda-bbbd-1a1f77f60ea4'; -- OM Public School, Tunga

update public.schools set city_id = 1, locality_id = (select id from public.localities where slug = 'bassi' and city_id = 1)
where id = '47cb5666-ce27-459a-86a3-ac26b9991408'; -- Sanskar Public School, Bassi

update public.schools set city_id = 1, locality_id = (select id from public.localities where slug = 'kishangarh-renwal' and city_id = 1)
where id = '7c3b0adc-011d-486c-af72-f7a7d5341981'; -- Shri Mahaveer Internatioal School, Kishangarh-Renwal

update public.schools set city_id = 1, locality_id = (select id from public.localities where slug = 'chomu' and city_id = 1)
where id in (
  'bbf23549-88c5-4fcf-b0f4-787130aea09e', -- The Asian International School
  '77cdd9af-3d3e-4dbd-8ef8-959d7dfbc476'  -- Vinayak International School
);

-- Conflict: address text says "MAIN SHIPRA PATH MANSAROVAR" (would match
-- locality 31, Shipra Path) but pincode (301001) and coordinates both resolve
-- to Alwar district, ~150km away and outside Jaipur entirely. Two evidence
-- sources actively disagree with high confidence on each side -> left
-- unassigned for /ops, not auto-resolved either way.
-- id bf0be670-cf7c-4b84-ba40-ef23e544f1d7, Deep International School: no update.

-- Unresolved: no usable evidence, or the named place isn't in our locality
-- catalog yet. Left unassigned for /ops.
-- - 093fba3c-1620-4ffd-92f3-658f21360677, Army Public School: address says
--   "Jaipur Cantt" (a real area, not yet in our locality catalog); pincode
--   (324008) and coordinates both resolve near Jhalawar district, untrustworthy.
-- - bc8f475c-9990-474c-b264-2b6f57ddaecf, Shankar Lal Dhanuka ... Jamdoli:
--   address names "Jamdoli", a real Jaipur-district area not yet in our
--   locality catalog; pincode 302031 not in locality_pincodes.
-- - 119f30bc-7da2-41e6-b982-7b6c5d53a981, Tree House High School: address
--   names "Kamala Nehru Nagar", not yet in our locality catalog; no
--   coordinates at all.
-- - c066cc3b-7c2f-4bab-bc29-222002049219, M S S Public School: address states
--   "Kishangarh, Distt Ajmer" explicitly -- this school is not in Jaipur
--   district at all. Its district_id is a data-quality issue in the source
--   table, out of this repo's scope (table structure/data ownership is the
--   data repo's); city_id/locality_id are correctly left null rather than
--   forced into Jaipur.
