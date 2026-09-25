-- Jaipur school -> city/locality assignment, 38 schools in the Jaipur district
-- (district_id=75). REPLACES the first version of this file (never applied) —
-- that version trusted the pre-existing schools.locality_id/location for
-- geocode_precision='locality' rows as if they were independent evidence. They
-- are not: those coordinates are locality CENTROIDS, i.e. already a locality
-- guess turned into a point, not a geocode of the school itself. Using them as
-- assignment evidence is circular. Corrected evidence order, strict:
--   1. Address text — matched against the real locality/corridor/town catalog
--      (localities.name_en/aliases, corridors.name/aliases), including partial
--      containment (e.g. "NEW SANGANER ROAD" in an address matches the
--      locality named exactly that). A corridor-only match (e.g. only "Ajmer
--      Road" appears, no locality-level name) does not resolve a locality.
--   2. Pincode — locality_pincodes, and ONLY when it maps to exactly one
--      locality; an address with no catalog match and a pincode mapping to
--      several localities is genuinely unresolved, not guessed.
--   3. Coordinates/geocode_precision — NEVER used as locality evidence. Every
--      Jaipur school is geocode_precision='locality' or 'pincode', never
--      'exact', and precision='locality' rows' own coordinates are themselves
--      derived from a locality guess — using them to assign a locality would
--      just be checking the guess against itself.
--
-- M S S Public School is excluded entirely: its address states "Kishangarh,
-- Distt Ajmer" -- it is not in Jaipur district. city_id/locality_id/district_id
-- are left exactly as they are; this is a data-quality issue in the source
-- table (district_id), out of this repo's scope to correct (table structure/
-- data ownership is the data repo's).
--
-- Deep International School is sent to /ops regardless of address clarity:
-- its address alone would resolve cleanly to Shipra Path, but its pincode and
-- coordinates both resolve ~150km away in Alwar district. When one evidence
-- source is that far off, the row needs a human, not an automatic resolution
-- that ignores the anomaly.
--
-- Idempotent: keyed by school id, safe to re-run. No explicit begin/commit
-- (scripts/db-migrate.mjs wraps this already; see jaipur_localities.sql for
-- why a nested transaction silently breaks over Supabase's pooled connection).

-- Five real small towns/tehsils in Jaipur district, not city neighbourhoods,
-- not in the JaipurCircle locality catalog. Ordinary localities rows (same
-- table schools.locality_id already points at); app code distinguishes them
-- from city localities via a small hardcoded slug list (same pattern as the
-- is_launch district list), not a new column. Unchanged from the first
-- version of this file — none of these were geocode-derived.
insert into public.localities (city_id, name_en, slug, centroid, source, status)
values
  (1, 'Dudu', 'dudu', ST_SetSRID(ST_MakePoint(75.335925, 26.734025), 4326)::geography, 'school-assignment-manual', 'active'),
  (1, 'Tunga', 'tunga', null, 'school-assignment-manual', 'active'),
  (1, 'Bassi', 'bassi', ST_SetSRID(ST_MakePoint(76.17816, 26.80228), 4326)::geography, 'school-assignment-manual', 'active'),
  (1, 'Kishangarh-Renwal', 'kishangarh-renwal', ST_SetSRID(ST_MakePoint(75.585833, 26.9452), 4326)::geography, 'school-assignment-manual', 'active'),
  (1, 'Chomu', 'chomu', ST_SetSRID(ST_MakePoint(75.69195, 27.165075), 4326)::geography, 'school-assignment-manual', 'active')
on conflict (city_id, slug) do nothing;

-- Every school below gets city_id reset to null first, then re-set only where
-- resolved -- rerunning this file after an evidence correction must not leave
-- a stale assignment from a previous run.
update public.schools set city_id = null, locality_id = null
where district_id = 75 and id <> 'c066cc3b-7c2f-4bab-bc29-222002049219'; -- M S S Public School untouched entirely

-- Resolved via address text (locality name/alias found directly in the address,
-- no contradicting higher-priority evidence -- there is none higher).
update public.schools set city_id = 1, locality_id = 84 -- Mansarovar
where id in (
  '2ddd5df1-8368-4e92-a4b9-277aa114038c', -- American International School: "...NEW SANGANER ROAD MANSAROVER JAIPUR"
  'e7b62119-730c-4e77-880b-03a196c62881'  -- Banyan Tree School: "SECTOR 7, MADHYAM MARG, MANSAROVAR"
);

update public.schools set city_id = 1, locality_id = 49 -- Panchyawala
where id = 'd37bba70-2679-4539-b09f-788cf7b2e5f6'; -- B.p. Convent School: "...PANCHYAWALA, SIRSI ROAD"

update public.schools set city_id = 1, locality_id = 25 -- Sanganer
where id = '7e57d941-6285-4dd5-bf01-2f23cf622f83'; -- Edify World School: "...AJMER ROAD, SANGANER, JAIPUR"

update public.schools set city_id = 1, locality_id = 11 -- Jagatpura
where id in (
  'cf585d0b-d623-481b-86a6-40ae533770dc', -- Golden Era Academy: "...JAIPURA JAGATPURA"
  'b0fcefe0-7271-4b72-8805-099654aa85b2', -- Jayshree Periwal Global School: "...JAGATPURA, JAIPUR"
  '55513a71-46d4-468c-8696-ea8da74b837c'  -- Sadguru Public School: "...JAGATPURA, JAIPUR"
);

update public.schools set city_id = 1, locality_id = 94 -- Mahapura
where id = '7bd592e3-c000-4630-a9b7-3bafcc6fa8e3'; -- J. D. International School: "MAHAPURA, AJMER ROAD, JAIPUR"

update public.schools set city_id = 1, locality_id = 22 -- Chitrakoot
where id in (
  '8c63180c-9262-4a51-bfcd-2370c76511a5', -- Jayshree Periwal High School: "3 CHITRAKOOT SCHEME AJMER ROAD"
  '9fee949f-f539-4378-ae0e-5e77eeef4ebe'  -- Sri Chaitanya Techno School (200ft Bypass): "...OPP CHITRAKOOT, AJMER ROAD"
);

update public.schools set city_id = 1, locality_id = 21 -- Vidyadhar Nagar
where id = '3774acb1-139d-4ee3-93fd-a1ecf16e5678'; -- Maheshwari Girls Pub School: "SECTOR 1 VIDYADHAR NAGAR"

update public.schools set city_id = 1, locality_id = 66 -- Kalwar Road
where id in (
  'f562bef6-3ea1-418f-bc5f-69810d2ba07e', -- Mahrishi Dayanand Public School: "...KALWAR ROAD, JAIPUR"
  '8cbdf11e-a80f-40dc-a07b-4118aec89df5', -- Scholars International School: "...KALWAR ROAD, GOVINDPURA, HATHOJ"
  '760a0e4c-3c19-475c-8a4f-b9f3cdd84cb0'  -- Vardhman Srikalyan International School: "KALWAR ROAD, HATHOJ"
);

update public.schools set city_id = 1, locality_id = 85 -- Malviya Nagar
where id = '70042f52-e4b9-4178-a94e-c87139b1ff8b'; -- Malviya Convent School: "...KARDHANI SHOPPING CENTRE,MALVIYA NAGAR"

update public.schools set city_id = 1, locality_id = 13 -- Bhankrota
where id = 'bd897b42-0989-4366-99da-e36312f7da6f'; -- R.k. International School: "...JAISINGHPURA ROAD, BHANKROTA"

update public.schools set city_id = 1, locality_id = 19 -- Pratap Nagar
where id = 'd5bb1806-9472-4a93-ba90-2413493865b1'; -- Saint Soldier Public School: "SEC.8, PRATAP NAGAR"

update public.schools set city_id = 1, locality_id = 18 -- Jhotwara
where id = '2a6712f1-6083-4a5c-afb0-98d929cf612f'; -- ST Anselms North City School: "NIVARU ROAD JHOTWARA JAIPUR"

update public.schools set city_id = 1, locality_id = 46 -- City Palace
where id = '801b38f3-98bf-4096-baa1-9fbff5638258'; -- The Palace School: "JALEB CHOCK, CITY PALACE, JAIPUR"

update public.schools set city_id = 1, locality_id = 92 -- New Sanganer Road
where id in (
  '60b17ae3-66ca-4fea-9278-f91c5ed313b8', -- Oxford International Public School: "...NEW SANGANER,JAIPUR"
  '36b0ae65-54ad-4b97-afc5-2fc6ea0c7bcf'  -- Yugantar International School: "...NEW SANGANER ROAD,JAIPUR"
);

-- Resolved via pincode: exactly one locality_pincodes match, and address gave
-- no catalog-recognizable name to use instead.
update public.schools set city_id = 1, locality_id = 49 -- Panchyawala (pincode 302034, single match)
where id = '2429434e-1823-41dd-b5bb-336f3454a6dc'; -- Alpha International Academy: "SIRSI ROAD, JAIPUR" (no locality name in address)

-- Resolved as "Near <town>" (address confirms a real Jaipur-district town, not
-- in the city locality catalog).
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

-- Everything else stays unassigned (city_id/locality_id null) -- that null-
-- locality-under-launched-city set IS the /ops queue until Flow 6.15 builds a
-- real screen on top of it. No further UPDATEs below; documented for the record:
--
-- Conflict (explicit /ops regardless of address clarity):
-- - bf0be670-cf7c-4b84-ba40-ef23e544f1d7, Deep International School: address
--   alone reads as Shipra Path/Mansarovar, but pincode (301001) and
--   coordinates both resolve to Alwar district, ~150km away.
--
-- Unresolved -- no catalog-recognizable place in the address, and pincode is
-- either absent from locality_pincodes or maps to more than one locality
-- (302012 -> Jhotwara/Kalwar Road/Kardhani/Jhotwara Industrial Area; 302021 ->
-- 5 localities) so it cannot single out one without guessing:
-- - 093fba3c-1620-4ffd-92f3-658f21360677, Army Public School: "Jaipur Cantt"
--   is real but not in the locality catalog; pincode (324008) resolves near
--   Jhalawar district, untrustworthy.
-- - 8e9771ac-ebee-4552-94ab-96c7b1a1384c, Aurobindo International School:
--   "Sirsi Road, Sirsi Mod" only; pincode 302012 ambiguous (4 localities).
-- - da4c58ef-1cb7-4c8b-a0be-d24f6ca2597e, Central Academy: "Ambabari" is a
--   real Jaipur area not yet in the locality catalog; pincode 302012 ambiguous.
-- - 2d126fc6-880f-4a79-85ef-68ba627283a2, S S International School: "Ganesh
--   Nagar", "Niwaru Road" -- neither catalogued; pincode 302012 ambiguous.
-- - b07e018a-5dc7-4c2e-984a-dd004d1fb85b, Sri Chaitanya Techno School
--   (Hardatpura): "Gram Hardatpura Khora Bisal" -- not catalogued; pincode
--   302012 ambiguous.
-- - 1caca89e-4275-45e7-b7c4-dc79522c3a4a, Prg World School: "Tagore Nagar" not
--   catalogued; only "Ajmer Road" (corridor, not a locality) otherwise;
--   pincode 302021 ambiguous (5 localities).
-- - bc8f475c-9990-474c-b264-2b6f57ddaecf, Shankar Lal Dhanuka ... Jamdoli:
--   "Jamdoli" is real but not in the locality catalog; pincode 302031 not in
--   locality_pincodes.
-- - 119f30bc-7da2-41e6-b982-7b6c5d53a981, Tree House High School: "Kamala
--   Nehru Nagar" not catalogued; pincode 302024 not in locality_pincodes.
--
-- Excluded (not Jaipur district -- data issue, out of this repo's scope):
-- - c066cc3b-7c2f-4bab-bc29-222002049219, M S S Public School: address states
--   "Kishangarh, Distt Ajmer" explicitly.
