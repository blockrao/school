-- Idempotent seed: enriches existing Jaipur localities from the JaipurCircle CSV
-- export (data/imports/jaipurcircle_localities.csv, gitignored, not committed).
-- Upserts by (city_id, slug) -- the existing unique constraint -- never deletes.
-- Structured facts only: no description/vibe/character tags/real_estate/
-- best_for/known_for/police_station fields were copied. See
-- docs/city-mapping-seed.md for the full report.
--
-- No explicit begin/commit here — scripts/db-migrate.mjs already wraps the whole
-- file in one transaction. A nested begin/commit inside that (this file's own,
-- from an earlier version) silently ended the outer transaction early over
-- Supabase's pooled connection, which is why the first apply attempt reported
-- success but left corridors/locality_neighbors/locality_pincodes/landmarks and
-- schema_migrations itself empty.

-- Locality enrichment (name_hi, centroid, zone/ward as internal fields,
-- aliases, source attribution). name_hi is machine-generated for every row
-- and marked needs_review -- including the 5 rows that already had real
-- Devanagari text, since none of it has been independently verified here.
update public.localities set
  name_hi = 'आदर्श नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8326, 26.8978), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, '77'),
  ward_name = coalesce(ward_name, 'Adarsh Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'adarsh-nagar'
where slug = 'adarsh-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'आदर्श नगर सर्कल',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8298, 26.8989), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'adarsh-nagar-circle'
where slug = 'adarsh-nagar-circle'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'आमेर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8512, 26.9856), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, '6'),
  ward_name = coalesce(ward_name, 'Amer Ward'),
  source = 'jaipurcircle',
  external_ref = 'amer'
where slug = 'amer'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'आम्रपाली सर्कल',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7399, 26.9106), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'amrapali-circle'
where slug = 'amrapali-circle'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'बड़ी चौपड़',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8267, 26.9234), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'badi-chaupar'
where slug = 'badi-chaupar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'बगरू',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.5678, 26.8123), 4326)::geography,
  zone = coalesce(zone, 'Vishwakarma Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'bagru'
where slug = 'bagru'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'बनी पार्क',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '44'),
  ward_name = coalesce(ward_name, 'Bani Park Ward'),
  source = 'jaipurcircle',
  external_ref = 'bani-park'
where slug = 'bani-park'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'बापू बाज़ार',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8234, 26.9189), 4326)::geography,
  zone = coalesce(zone, 'Walled City Zone'),
  ward_number = coalesce(ward_number, '52'),
  ward_name = coalesce(ward_name, 'Bapu Bazaar Ward'),
  source = 'jaipurcircle',
  external_ref = 'bapu-bazaar'
where slug = 'bapu-bazaar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'बापू नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8178, 26.8823), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '54'),
  ward_name = coalesce(ward_name, 'Bapu Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'bapu-nagar'
where slug = 'bapu-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'भांकरोटा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7032, 26.8932), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'bhankrota'
where slug = 'bhankrota'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'ब्रह्मपुरी',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8067, 26.9289), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'brahmpuri'
where slug = 'brahmpuri'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सी स्कीम',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8156, 26.8989), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '35'),
  ward_name = coalesce(ward_name, 'C Scheme Ward'),
  source = 'jaipurcircle',
  external_ref = 'c-scheme'
where slug = 'c-scheme'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'चांदपोल',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8123, 26.9198), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'chandpole'
where slug = 'chandpole'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'चौड़ा रास्ता',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8145, 26.9223), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'chaura-rasta'
where slug = 'chaura-rasta'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'छोटी चौपड़',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8278, 26.9245), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'chhoti-chaupar'
where slug = 'chhoti-chaupar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'चित्रकूट',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7484, 26.9112), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '28'),
  ward_name = coalesce(ward_name, 'Chitrakoot Ward'),
  source = 'jaipurcircle',
  external_ref = 'chitrakoot'
where slug = 'chitrakoot'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'चोमू रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7234, 26.9678), 4326)::geography,
  zone = coalesce(zone, 'Vishwakarma Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'chomu-road'
where slug = 'chomu-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सिटी पैलेस',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8234, 26.9256), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'city-palace'
where slug = 'city-palace'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सिविल लाइन्स',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'civil-lines'
where slug = 'civil-lines'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'दुर्गापुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8234, 26.8512), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '30'),
  ward_name = coalesce(ward_name, 'Durgapura Ward'),
  source = 'jaipurcircle',
  external_ref = 'durgapura'
where slug = 'durgapura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'गांधी पथ पश्चिम',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7312, 26.9198), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'gandhi-path-west'
where slug = 'gandhi-path-west'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'घाट गेट',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8323, 26.9189), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'ghat-gate'
where slug = 'ghat-gate'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'गोनेर रोड',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'goner-road'
where slug = 'goner-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'गोपालबाड़ी',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7945, 26.9145), 4326)::geography,
  zone = coalesce(zone, 'Walled City Zone'),
  ward_number = coalesce(ward_number, '48'),
  ward_name = coalesce(ward_name, 'Gopalbari Ward'),
  source = 'jaipurcircle',
  external_ref = 'gopalbari'
where slug = 'gopalbari'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'गोपालपुरा बाईपास',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8123, 26.8456), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '29'),
  ward_name = coalesce(ward_name, 'Gopalpura Ward'),
  source = 'jaipurcircle',
  external_ref = 'gopalpura-bypass'
where slug = 'gopalpura-bypass'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'हरमाड़ा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7423, 26.9734), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'harmada'
where slug = 'harmada'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'हवा महल',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8267, 26.9239), 4326)::geography,
  zone = coalesce(zone, 'Walled City Zone'),
  ward_number = coalesce(ward_number, '54'),
  ward_name = coalesce(ward_name, 'Hawa Mahal Ward'),
  source = 'jaipurcircle',
  external_ref = 'hawa-mahal'
where slug = 'hawa-mahal'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'हीरापुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7034, 26.8923), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '32'),
  ward_name = coalesce(ward_name, 'Heerapura Ward'),
  source = 'jaipurcircle',
  external_ref = 'heerapura'
where slug = 'heerapura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जगतपुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8312, 26.8389), 4326)::geography,
  zone = coalesce(zone, 'Jhotwara Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, 'Spans multiple wards — check your exact block/street on the official JMC ward map: https://jaipurmc.org/PDF/wardmap.pdf'),
  source = 'jaipurcircle',
  external_ref = 'jagatpura'
where slug = 'jagatpura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जयपुर बाईपास',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8567, 26.8789), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'jaipur-bypass'
where slug = 'jaipur-bypass'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जल महल',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8456, 26.9534), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'jal-mahal'
where slug = 'jal-mahal'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जनता कॉलोनी',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8387, 26.9012), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'janta-colony'
where slug = 'janta-colony'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जनता कॉलोनी मेन रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8398, 26.9026), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'janta-colony-main-road'
where slug = 'janta-colony-main-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जंतर मंतर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8245, 26.9248), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'jantar-mantar'
where slug = 'jantar-mantar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जवाहर सर्कल',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8089, 26.8645), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '59'),
  ward_name = coalesce(ward_name, 'Jawahar Circle Ward'),
  source = 'jaipurcircle',
  external_ref = 'jawahar-circle'
where slug = 'jawahar-circle'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जवाहर नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8343, 26.9008), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, '75'),
  ward_name = coalesce(ward_name, 'Jawahar Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'jawahar-nagar'
where slug = 'jawahar-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'झालाना डूंगरी',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'jhalana-doongri'
where slug = 'jhalana-doongri'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'झोटवाड़ा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7567, 26.9456), 4326)::geography,
  zone = coalesce(zone, 'Jhotwara Zone'),
  ward_number = coalesce(ward_number, '15'),
  ward_name = coalesce(ward_name, 'Jhotwara Ward'),
  source = 'jaipurcircle',
  external_ref = 'jhotwara'
where slug = 'jhotwara'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'झोटवाड़ा औद्योगिक क्षेत्र',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7534, 26.9489), 4326)::geography,
  zone = coalesce(zone, 'Jhotwara Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'jhotwara-industrial-area'
where slug = 'jhotwara-industrial-area'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जेएलएन मार्ग',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8123, 26.8712), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '40'),
  ward_name = coalesce(ward_name, 'JLN Marg Ward'),
  source = 'jaipurcircle',
  external_ref = 'jln-marg'
where slug = 'jln-marg'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'जौहरी बाज़ार',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8256, 26.9212), 4326)::geography,
  zone = coalesce(zone, 'Walled City Zone'),
  ward_number = coalesce(ward_number, '50'),
  ward_name = coalesce(ward_name, 'Johri Bazaar Ward'),
  source = 'jaipurcircle',
  external_ref = 'johri-bazaar'
where slug = 'johri-bazaar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'ज्योति नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7512, 26.9089), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'jyothi-nagar'
where slug = 'jyothi-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'कालवाड़ रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7123, 26.9234), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '36'),
  ward_name = coalesce(ward_name, 'Kalwar Road Ward'),
  source = 'jaipurcircle',
  external_ref = 'kalwar-road'
where slug = 'kalwar-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'कनकपुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7534, 26.9612), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'kanakpura'
where slug = 'kanakpura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'करधनी',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7612, 26.9512), 4326)::geography,
  zone = coalesce(zone, 'Jhotwara Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'kardhani'
where slug = 'kardhani'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'खोले के हनुमान जी क्षेत्र',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'khole-ke-hanuman-ji-area'
where slug = 'khole-ke-hanuman-ji-area'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'किशनपोल बाज़ार',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8167, 26.9178), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'kishanpole-bazaar'
where slug = 'kishanpole-bazaar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'कुकस',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8234, 26.9923), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'kukas'
where slug = 'kukas'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'लाल कोठी',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8234, 26.8912), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '52'),
  ward_name = coalesce(ward_name, 'Lal Kothi Ward'),
  source = 'jaipurcircle',
  external_ref = 'lal-kothi'
where slug = 'lal-kothi'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'महल रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8378, 26.8267), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'mahal-road'
where slug = 'mahal-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'महापुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.6912, 26.8856), 4326)::geography,
  zone = coalesce(zone, 'Vishwakarma Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'mahapura'
where slug = 'mahapura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'मालवीय नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8189, 26.8678), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '65'),
  ward_name = coalesce(ward_name, 'Malviya Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'malviya-nagar'
where slug = 'malviya-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'मानसरोवर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7734, 26.8756), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, 'Spans multiple wards — check your exact block/street on the official JMC ward map: https://jaipurmc.org/PDF/wardmap.pdf'),
  source = 'jaipurcircle',
  external_ref = 'mansarovar'
where slug = 'mansarovar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'मानसरोवर एक्सटेंशन',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7656, 26.8823), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'mansarovar-extension'
where slug = 'mansarovar-extension'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'एमआई रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8123, 26.9145), 4326)::geography,
  zone = coalesce(zone, 'Walled City Zone'),
  ward_number = coalesce(ward_number, '42'),
  ward_name = coalesce(ward_name, 'MI Road Ward'),
  source = 'jaipurcircle',
  external_ref = 'mi-road'
where slug = 'mi-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'मिनी सचिवालय परिसर',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'mini-secretariat-complex'
where slug = 'mini-secretariat-complex'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'मोती डूंगरी रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8349, 26.8928), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'moti-doongri-road'
where slug = 'moti-doongri-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'मुरलीपुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7678, 26.9534), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '34'),
  ward_name = coalesce(ward_name, 'Murlipura Ward'),
  source = 'jaipurcircle',
  external_ref = 'murlipura'
where slug = 'murlipura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'नाहरगढ़',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8156, 26.9378), 4326)::geography,
  zone = coalesce(zone, 'Vidyadhar Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'nahargarh'
where slug = 'nahargarh'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'नाहरगढ़ रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8156, 26.9345), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'nahargarh-road'
where slug = 'nahargarh-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'नेहरू बाज़ार',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'nehru-bazaar'
where slug = 'nehru-bazaar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'न्यू सांगानेर रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7878, 26.8634), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'new-sanganer-road'
where slug = 'new-sanganer-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'निर्माण नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7567, 26.9067), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '29'),
  ward_name = coalesce(ward_name, 'Nirman Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'nirman-nagar'
where slug = 'nirman-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'ऑफिसर्स कैंपस एक्सटेंशन',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'officers-campus-extension'
where slug = 'officers-campus-extension'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'पंचयावाला',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7234, 26.9312), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'panchyawala'
where slug = 'panchyawala'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'प्रताप नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7856, 26.8523), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '56'),
  ward_name = coalesce(ward_name, 'Pratap Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'pratap-nagar'
where slug = 'pratap-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'प्रताप नगर सेक्टर 1',
  name_hi_status = 'needs_review',
  centroid = centroid,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'pratap-nagar-sector-1'
where slug = 'pratap-nagar-sector-1'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'पुरानी बस्ती',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8089, 26.9267), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'purani-basti'
where slug = 'purani-basti'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'क्वींस रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7456, 26.9134), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '28'),
  ward_name = coalesce(ward_name, 'Queens Road Ward'),
  source = 'jaipurcircle',
  external_ref = 'queens-road'
where slug = 'queens-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'राजा पार्क',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8278, 26.8969), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, '76'),
  ward_name = coalesce(ward_name, 'Raja Park Ward'),
  source = 'jaipurcircle',
  external_ref = 'raja-park'
where slug = 'raja-park'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'राजा पार्क मार्केट',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8269, 26.8964), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'raja-park-market'
where slug = 'raja-park-market'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'रामचंद्रपुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.6978, 26.8878), 4326)::geography,
  zone = coalesce(zone, 'Vishwakarma Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'ramchandrapura'
where slug = 'ramchandrapura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'रामगंज',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8312, 26.9156), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'ramganj'
where slug = 'ramganj'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सांगानेर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8023, 26.8245), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '64'),
  ward_name = coalesce(ward_name, 'Sanganer Ward'),
  source = 'jaipurcircle',
  external_ref = 'sanganer'
where slug = 'sanganer'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सांगानेरी गेट',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8234, 26.9167), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'sanganeri-gate'
where slug = 'sanganeri-gate'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'शिप्रा पथ',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7689, 26.8789), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '57'),
  ward_name = coalesce(ward_name, 'Shipra Path Ward'),
  source = 'jaipurcircle',
  external_ref = 'shipra-path'
where slug = 'shipra-path'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'श्याम नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7623, 26.9078), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '28'),
  ward_name = coalesce(ward_name, 'Shyam Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'shyam-nagar'
where slug = 'shyam-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सीकर रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7489, 26.9567), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '35'),
  ward_name = coalesce(ward_name, 'Sikar Road Ward'),
  source = 'jaipurcircle',
  external_ref = 'sikar-road'
where slug = 'sikar-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सिंधी कैंप',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7912, 26.9212), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '46'),
  ward_name = coalesce(ward_name, 'Sindhi Camp Ward'),
  source = 'jaipurcircle',
  external_ref = 'sindhi-camp'
where slug = 'sindhi-camp'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सीतापुरा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8456, 26.7978), 4326)::geography,
  zone = coalesce(zone, 'Sanganer Zone'),
  ward_number = coalesce(ward_number, '66'),
  ward_name = coalesce(ward_name, 'Sitapura Ward'),
  source = 'jaipurcircle',
  external_ref = 'sitapura'
where slug = 'sitapura'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सोडाला',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7678, 26.9023), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, 'Spans multiple wards — check your exact block/street on the official JMC ward map: https://jaipurmc.org/PDF/wardmap.pdf'),
  source = 'jaipurcircle',
  external_ref = 'sodala'
where slug = 'sodala'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'स्टेशन रोड',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7878, 26.9178), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '45'),
  ward_name = coalesce(ward_name, 'Station Road Ward'),
  source = 'jaipurcircle',
  external_ref = 'station-road'
where slug = 'station-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'सूरजपोल',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8289, 26.9178), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'surajpole'
where slug = 'surajpole'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'तिलक नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8379, 26.8949), 4326)::geography,
  zone = coalesce(zone, 'Adarsh Nagar Zone'),
  ward_number = coalesce(ward_number, '77'),
  ward_name = coalesce(ward_name, 'Tilak Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'tilak-nagar'
where slug = 'tilak-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'तोपखाना देश',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8334, 26.9123), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'topkhana-desh'
where slug = 'topkhana-desh'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'त्रिपोलिया बाज़ार',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8189, 26.9223), 4326)::geography,
  zone = coalesce(zone, 'Hawa Mahal Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'tripolia-bazaar'
where slug = 'tripolia-bazaar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'वैशाली नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7389, 26.9123), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, 'Spans multiple wards — check your exact block/street on the official JMC ward map: https://jaipurmc.org/PDF/wardmap.pdf'),
  source = 'jaipurcircle',
  external_ref = 'vaishali-nagar'
where slug = 'vaishali-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'विद्याधर नगर',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7823, 26.9389), 4326)::geography,
  zone = coalesce(zone, 'Civil Lines Zone'),
  ward_number = coalesce(ward_number, '65'),
  ward_name = coalesce(ward_name, 'Vidhyadhar Nagar Ward'),
  source = 'jaipurcircle',
  external_ref = 'vidyadhar-nagar'
where slug = 'vidyadhar-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'विश्वकर्मा',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7412, 26.9378), 4326)::geography,
  zone = coalesce(zone, 'Vishwakarma Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'vishwakarma'
where slug = 'vishwakarma'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'विश्वकर्मा औद्योगिक क्षेत्र',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.7378, 26.9412), 4326)::geography,
  zone = coalesce(zone, 'Vishwakarma Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'vishwakarma-industrial-area'
where slug = 'vishwakarma-industrial-area'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  name_hi = 'वर्ल्ड ट्रेड पार्क',
  name_hi_status = 'needs_review',
  centroid = ST_SetSRID(ST_MakePoint(75.8156, 26.8734), 4326)::geography,
  zone = coalesce(zone, 'Jhotwara Zone'),
  ward_number = coalesce(ward_number, null),
  ward_name = coalesce(ward_name, null),
  source = 'jaipurcircle',
  external_ref = 'world-trade-park'
where slug = 'world-trade-park'
  and city_id = (select id from public.cities where slug = 'jaipur');

-- Heerapura becomes a sub-locality of Bhankrota (explicit decision).
update public.localities set parent_locality_id = (
  select id from public.localities where slug = 'bhankrota'
    and city_id = (select id from public.cities where slug = 'jaipur')
)
where slug = 'heerapura'
  and city_id = (select id from public.cities where slug = 'jaipur');

-- Walled City: new locality (not in our existing 97). The source export has
-- no coordinates/zone/pincode/landmarks for it -- everything beyond name/slug
-- stays null, same 'Not yet published'-style honesty as everywhere else.
insert into public.localities (city_id, name_en, name_hi, name_hi_status, slug, status, source, external_ref)
values (
  (select id from public.cities where slug = 'jaipur'),
  'Walled City', 'परकोटा', 'needs_review', 'walled-city',
  'active', 'jaipurcircle', 'walled-city'
)
on conflict (city_id, slug) do update set
  name_hi = excluded.name_hi,
  name_hi_status = excluded.name_hi_status,
  source = excluded.source,
  external_ref = excluded.external_ref;

-- Vaishali Nagar micro_localities: 'Nursery Circle' is a distinct, locatable
-- place -> new sub-locality (no coordinates in source; left null rather than
-- guessed). 'Vaishali Marg' -> alias. 'Amrapali Circle'/'Gandhi Path'/'Queens
-- Road' are already independent locality rows -- left untouched, not aliased
-- under Vaishali Nagar. 'Chitrakoot side'/'Ajmer Road side'/'Khatipura Road
-- side' are directional descriptions, not place names -- excluded entirely.
insert into public.localities (city_id, name_en, name_hi_status, slug, status, parent_locality_id, source, external_ref)
values (
  (select id from public.cities where slug = 'jaipur'),
  'Nursery Circle', 'needs_review', 'nursery-circle', 'active',
  (select id from public.localities where slug = 'vaishali-nagar' and city_id = (select id from public.cities where slug = 'jaipur')),
  'jaipurcircle', 'vaishali-nagar:nursery-circle'
)
on conflict (city_id, slug) do update set
  parent_locality_id = excluded.parent_locality_id;
update public.localities set
  aliases = (select array(select distinct unnest(aliases || ARRAY['vaishali-marg']::text[])))
where slug = 'vaishali-nagar'
  and city_id = (select id from public.cities where slug = 'jaipur');

-- Corridors: roads reclassified out of localities per instruction. Old
-- locality rows are NOT deleted (kept, unmodified, flagged via
-- superseded_by_corridor_id so the app knows not to treat them as normal
-- localities going forward).
insert into public.corridors (name, slug, aliases, centroid)
values ('Ajmer Road', 'ajmer-road', ARRAY['ajmer-road']::text[], ST_SetSRID(ST_MakePoint(75.741, 26.902), 4326)::geography)
on conflict (slug) do update set centroid = excluded.centroid, aliases = excluded.aliases;
insert into public.corridors (name, slug, aliases, centroid)
values ('Tonk Road', 'tonk-road', ARRAY['tonk-road']::text[], ST_SetSRID(ST_MakePoint(75.8278, 26.8567), 4326)::geography)
on conflict (slug) do update set centroid = excluded.centroid, aliases = excluded.aliases;
insert into public.corridors (name, slug, aliases, centroid)
values ('Amer Road', 'amer-road', ARRAY['amer-road']::text[], ST_SetSRID(ST_MakePoint(75.8234, 26.9423), 4326)::geography)
on conflict (slug) do update set centroid = excluded.centroid, aliases = excluded.aliases;
insert into public.corridors (name, slug, aliases, centroid)
values ('Agra Road', 'agra-road', ARRAY['agra-road']::text[], ST_SetSRID(ST_MakePoint(75.8456, 26.9112), 4326)::geography)
on conflict (slug) do update set centroid = excluded.centroid, aliases = excluded.aliases;
insert into public.corridors (name, slug, aliases, centroid)
values ('Delhi Road', 'delhi-road', ARRAY['delhi-road']::text[], ST_SetSRID(ST_MakePoint(75.8123, 27.0123), 4326)::geography)
on conflict (slug) do update set centroid = excluded.centroid, aliases = excluded.aliases;
insert into public.corridors (name, slug, aliases, centroid)
values ('200 ft Bypass', '200ft-bypass', ARRAY['200ft-bypass-ajmer-road']::text[], ST_SetSRID(ST_MakePoint(75.7333, 26.903), 4326)::geography)
on conflict (slug) do update set centroid = excluded.centroid, aliases = excluded.aliases;

-- Mark the 6 old road/corridor locality rows as superseded (not deleted).
update public.localities set
  superseded_by_corridor_id = (select id from public.corridors where slug = 'ajmer-road')
where slug = 'ajmer-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  superseded_by_corridor_id = (select id from public.corridors where slug = 'tonk-road')
where slug = 'tonk-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  superseded_by_corridor_id = (select id from public.corridors where slug = 'amer-road')
where slug = 'amer-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  superseded_by_corridor_id = (select id from public.corridors where slug = 'agra-road')
where slug = 'agra-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  superseded_by_corridor_id = (select id from public.corridors where slug = 'delhi-road')
where slug = 'delhi-road'
  and city_id = (select id from public.cities where slug = 'jaipur');
update public.localities set
  superseded_by_corridor_id = (select id from public.corridors where slug = '200ft-bypass')
where slug = '200ft-bypass-ajmer-road'
  and city_id = (select id from public.cities where slug = 'jaipur');

-- locality_pincodes, from the CSV's pincode/pin_code fields (pincode preferred,
-- pin_code as fallback where pincode is blank).
-- 80 locality-pincode pairs.
insert into public.locality_pincodes (locality_id, pincode)
select l.id, v.pincode
from (values
  ('adarsh-nagar', '302004'),
  ('adarsh-nagar-circle', '302004'),
  ('amer', '302028'),
  ('amrapali-circle', '302021'),
  ('badi-chaupar', '302003'),
  ('bagru', '303007'),
  ('bani-park', '302006'),
  ('bapu-bazaar', '302002'),
  ('bapu-nagar', '302015'),
  ('bhankrota', '302026'),
  ('brahmpuri', '302002'),
  ('c-scheme', '302001'),
  ('chandpole', '302001'),
  ('chaura-rasta', '302007'),
  ('chitrakoot', '302021'),
  ('city-palace', '302002'),
  ('civil-lines', '302006'),
  ('durgapura', '302018'),
  ('gandhi-path-west', '302021'),
  ('ghat-gate', '302003'),
  ('goner-road', '302022'),
  ('gopalbari', '302001'),
  ('gopalpura-bypass', '302018'),
  ('harmada', '302013'),
  ('hawa-mahal', '302002'),
  ('heerapura', '302026'),
  ('jagatpura', '302017'),
  ('jal-mahal', '302002'),
  ('janta-colony', '302004'),
  ('janta-colony-main-road', '302004'),
  ('jantar-mantar', '302002'),
  ('jawahar-circle', '302017'),
  ('jawahar-nagar', '302004'),
  ('jhalana-doongri', '302004'),
  ('jhotwara', '302012'),
  ('jhotwara-industrial-area', '302012'),
  ('jln-marg', '302017'),
  ('johri-bazaar', '302003'),
  ('jyothi-nagar', '302005'),
  ('kalwar-road', '302012'),
  ('kardhani', '302012'),
  ('kishanpole-bazaar', '302002'),
  ('kukas', '302028'),
  ('lal-kothi', '302015'),
  ('mahal-road', '302017'),
  ('mahapura', '302029'),
  ('malviya-nagar', '302017'),
  ('mansarovar', '302020'),
  ('mansarovar-extension', '302020'),
  ('mi-road', '302001'),
  ('mini-secretariat-complex', '302016'),
  ('moti-doongri-road', '302004'),
  ('murlipura', '302013'),
  ('nahargarh-road', '302001'),
  ('new-sanganer-road', '302019'),
  ('nirman-nagar', '302019'),
  ('panchyawala', '302034'),
  ('pratap-nagar', '302033'),
  ('pratap-nagar-sector-1', '302033'),
  ('purani-basti', '302001'),
  ('queens-road', '302021'),
  ('raja-park', '302004'),
  ('raja-park-market', '302004'),
  ('ramganj', '302003'),
  ('sanganer', '302029'),
  ('shipra-path', '302020'),
  ('shyam-nagar', '302019'),
  ('sikar-road', '302013'),
  ('sindhi-camp', '302006'),
  ('sitapura', '302022'),
  ('sodala', '302019'),
  ('station-road', '302006'),
  ('surajpole', '302003'),
  ('tilak-nagar', '302004'),
  ('tripolia-bazaar', '302002'),
  ('vaishali-nagar', '302021'),
  ('vidyadhar-nagar', '302023'),
  ('vishwakarma', '302013'),
  ('vishwakarma-industrial-area', '302013'),
  ('world-trade-park', '302017')
) as v(slug, pincode)
join public.localities l on l.slug = v.slug and l.city_id = (select id from public.cities where slug = 'jaipur')
on conflict (locality_id, pincode) do nothing;

-- landmarks, from the CSV's `landmarks` field (structured place names only --
-- `parks` was excluded even though more populated, since its entries carry
-- descriptive fields (timings, features) beyond a bare name/type fact).
-- 30 landmark rows across 19 localities.
insert into public.landmarks (locality_id, name)
select l.id, v.name
from (values
  ('amer', 'Amer Fort'),
  ('bapu-bazaar', 'Hawa Mahal'),
  ('c-scheme', 'Central Park Jaipur'),
  ('c-scheme', 'Statue Circle'),
  ('chitrakoot', 'Queens Road corridor'),
  ('durgapura', 'Jaipur International Airport access'),
  ('hawa-mahal', 'Hawa Mahal'),
  ('jagatpura', 'JECRC access corridor'),
  ('jal-mahal', 'Jal Mahal'),
  ('jln-marg', 'Rajasthan International Centre'),
  ('jln-marg', 'JECC access corridor'),
  ('johri-bazaar', 'Johri Bazaar'),
  ('malviya-nagar', 'World Trade Park'),
  ('malviya-nagar', 'Jawahar Circle'),
  ('mansarovar', 'Mansarovar Metro access'),
  ('mansarovar-extension', 'Shipra Path corridor'),
  ('mi-road', 'Raj Mandir Cinema corridor'),
  ('raja-park', 'Raja Park Market'),
  ('shyam-nagar', 'Shyam Nagar Metro access'),
  ('sitapura', 'JECC'),
  ('tripolia-bazaar', 'Tripolia Gate'),
  ('vaishali-nagar', 'Amrapali Circle'),
  ('vaishali-nagar', 'Nursery Circle'),
  ('vaishali-nagar', 'Queens Road'),
  ('vaishali-nagar', 'Vaishali Marg'),
  ('vaishali-nagar', 'Gandhi Path'),
  ('vaishali-nagar', 'Elements Mall'),
  ('vaishali-nagar', 'Mall of Jaipur'),
  ('vaishali-nagar', 'Fortis Escorts Hospital'),
  ('vaishali-nagar', 'Vaishali Nagar Market')
) as v(slug, name)
join public.localities l on l.slug = v.slug and l.city_id = (select id from public.cities where slug = 'jaipur');

-- locality_neighbors: source-derived pairs (method='source') from the CSV's
-- nearby_localities field, distance computed from centroids where both ends
-- have coordinates. Localities with NO source-derived neighbors get
-- centroid-computed ones instead (method='computed', <=3km), same as before.
-- 432 source-derived adjacency rows.
insert into public.locality_neighbors (locality_id, neighbor_locality_id, distance_meters, method)
select l1.id, l2.id, v.distance_meters, 'source'
from (values
  ('adarsh-nagar', 'adarsh-nagar-circle', 303.4),
  ('adarsh-nagar', 'janta-colony', 713.3),
  ('adarsh-nagar', 'jawahar-nagar', 373.8),
  ('adarsh-nagar', 'moti-doongri-road', 600.9),
  ('adarsh-nagar', 'raja-park', 486.4),
  ('adarsh-nagar', 'tilak-nagar', 616.6),
  ('adarsh-nagar-circle', 'adarsh-nagar', 303.4),
  ('adarsh-nagar-circle', 'janta-colony', 918.9),
  ('adarsh-nagar-circle', 'jawahar-nagar', 493.7),
  ('adarsh-nagar-circle', 'raja-park', 298.0),
  ('adarsh-nagar-circle', 'tilak-nagar', 918.2),
  ('amer', 'agra-road', 8291.5),
  ('amer', 'amer-road', 5547.3),
  ('amer', 'delhi-road', 4865.0),
  ('amer', 'jal-mahal', 3623.2),
  ('amer', 'kukas', 2853.5),
  ('amer', 'nahargarh', 6379.6),
  ('amrapali-circle', 'chitrakoot', 845.4),
  ('amrapali-circle', 'gandhi-path-west', 1338.1),
  ('amrapali-circle', 'queens-road', 645.3),
  ('amrapali-circle', 'vaishali-nagar', 213.5),
  ('badi-chaupar', 'bapu-bazaar', 597.8),
  ('badi-chaupar', 'city-palace', 408.5),
  ('badi-chaupar', 'hawa-mahal', 55.6),
  ('badi-chaupar', 'johri-bazaar', 267.8),
  ('badi-chaupar', 'tripolia-bazaar', 782.9),
  ('bagru', 'ajmer-road', 19866.9),
  ('bagru', 'bhankrota', 16166.3),
  ('bagru', 'mahapura', 14707.3),
  ('bapu-bazaar', 'badi-chaupar', 597.8),
  ('bapu-bazaar', 'city-palace', 745.0),
  ('bapu-bazaar', 'hawa-mahal', 645.1),
  ('bapu-bazaar', 'johri-bazaar', 336.1),
  ('bapu-bazaar', 'nehru-bazaar', null),
  ('bapu-bazaar', 'tripolia-bazaar', 584.8),
  ('bapu-nagar', 'c-scheme', 1858.7),
  ('bapu-nagar', 'durgapura', 3502.5),
  ('bapu-nagar', 'jawahar-circle', 2167.2),
  ('bapu-nagar', 'moti-doongri-road', 2058.9),
  ('bapu-nagar', 'tonk-road', 3014.5),
  ('bhankrota', 'ajmer-road', 3874.1),
  ('bhankrota', 'bagru', 16166.3),
  ('bhankrota', 'gandhi-path-west', 4056.7),
  ('bhankrota', 'panchyawala', 4676.1),
  ('brahmpuri', 'chandpole', 1154.2),
  ('brahmpuri', 'hawa-mahal', 2059.3),
  ('brahmpuri', 'jal-mahal', 4721.3),
  ('brahmpuri', 'ramganj', 2843.8),
  ('c-scheme', 'malviya-nagar', 3473.6),
  ('c-scheme', 'vaishali-nagar', 7750.0),
  ('chandpole', 'badi-chaupar', 1482.7),
  ('chandpole', 'chhoti-chaupar', 1623.2),
  ('chandpole', 'city-palace', 1275.5),
  ('chandpole', 'hawa-mahal', 1498.7),
  ('chandpole', 'kishanpole-bazaar', 489.7),
  ('chandpole', 'tripolia-bazaar', 711.0),
  ('chaura-rasta', 'badi-chaupar', 1215.7),
  ('chaura-rasta', 'chandpole', 353.3),
  ('chaura-rasta', 'city-palace', 955.6),
  ('chaura-rasta', 'hawa-mahal', 1222.6),
  ('chaura-rasta', 'tripolia-bazaar', 436.2),
  ('chhoti-chaupar', 'badi-chaupar', 163.9),
  ('chhoti-chaupar', 'chandpole', 1623.2),
  ('chhoti-chaupar', 'hawa-mahal', 127.8),
  ('chhoti-chaupar', 'surajpole', 752.9),
  ('chhoti-chaupar', 'tripolia-bazaar', 915.7),
  ('chitrakoot', 'ajmer-road', 1258.9),
  ('chitrakoot', 'amrapali-circle', 845.4),
  ('chitrakoot', 'nirman-nagar', 963.2),
  ('chitrakoot', 'queens-road', 370.0),
  ('chitrakoot', 'sodala', 2163.3),
  ('chitrakoot', 'vaishali-nagar', 949.9),
  ('chomu-road', 'harmada', 1973.8),
  ('chomu-road', 'kalwar-road', 5058.2),
  ('chomu-road', 'sikar-road', 2812.6),
  ('chomu-road', 'vishwakarma', 3773.7),
  ('city-palace', 'bapu-bazaar', 745.0),
  ('city-palace', 'hawa-mahal', 377.9),
  ('city-palace', 'jantar-mantar', 140.7),
  ('city-palace', 'johri-bazaar', 535.7),
  ('city-palace', 'topkhana-desh', 1780.5),
  ('city-palace', 'tripolia-bazaar', 577.7),
  ('durgapura', 'jawahar-circle', 2063.0),
  ('durgapura', 'jln-marg', 2481.6),
  ('durgapura', 'lal-kothi', 4447.8),
  ('durgapura', 'malviya-nagar', 1899.0),
  ('durgapura', 'mansarovar', 5653.4),
  ('durgapura', 'tonk-road', 751.4),
  ('gandhi-path-west', 'ajmer-road', 2204.9),
  ('gandhi-path-west', 'chitrakoot', 1955.2),
  ('gandhi-path-west', 'nirman-nagar', 2918.0),
  ('gandhi-path-west', 'panchyawala', 1484.9),
  ('gandhi-path-west', 'queens-road', 1595.3),
  ('gandhi-path-west', 'vaishali-nagar', 1130.6),
  ('ghat-gate', 'hawa-mahal', 785.7),
  ('ghat-gate', 'johri-bazaar', 711.8),
  ('ghat-gate', 'ramganj', 382.8),
  ('ghat-gate', 'surajpole', 358.6),
  ('goner-road', 'jagatpura', null),
  ('goner-road', 'pratap-nagar', null),
  ('goner-road', 'sitapura', null),
  ('goner-road', 'tonk-road', null),
  ('gopalbari', 'c-scheme', 2717.8),
  ('gopalbari', 'civil-lines', null),
  ('gopalbari', 'mi-road', 1764.9),
  ('gopalbari', 'sindhi-camp', 813.7),
  ('gopalbari', 'station-road', 758.9),
  ('gopalpura-bypass', 'ajmer-road', 9452.2),
  ('gopalpura-bypass', 'jyothi-nagar', 9288.0),
  ('gopalpura-bypass', 'nirman-nagar', 8750.4),
  ('gopalpura-bypass', 'shyam-nagar', 8510.5),
  ('gopalpura-bypass', 'sodala', 7696.2),
  ('harmada', 'chomu-road', 1973.8),
  ('harmada', 'delhi-road', 8174.0),
  ('harmada', 'sikar-road', 1968.8),
  ('harmada', 'vidyadhar-nagar', 5516.7),
  ('hawa-mahal', 'bapu-bazaar', 645.1),
  ('hawa-mahal', 'chandpole', 1498.7),
  ('hawa-mahal', 'city-palace', 377.9),
  ('hawa-mahal', 'johri-bazaar', 319.4),
  ('hawa-mahal', 'nehru-bazaar', null),
  ('hawa-mahal', 'tripolia-bazaar', 793.5),
  ('heerapura', 'jhotwara-industrial-area', 8011.5),
  ('heerapura', 'vishwakarma', 6296.3),
  ('heerapura', 'vishwakarma-industrial-area', 6418.6),
  ('jagatpura', 'jln-marg', 4051.5),
  ('jagatpura', 'malviya-nagar', 3437.4),
  ('jagatpura', 'mansarovar', 7037.8),
  ('jagatpura', 'pratap-nagar', 4763.1),
  ('jagatpura', 'sitapura', 4788.3),
  ('jagatpura', 'tonk-road', 2007.8),
  ('jaipur-bypass', 'amer', 11877.0),
  ('jaipur-bypass', 'amer-road', 7784.7),
  ('jaipur-bypass', 'delhi-road', 15472.5),
  ('jaipur-bypass', 'jal-mahal', 8356.8),
  ('jaipur-bypass', 'nahargarh-road', 7404.8),
  ('jal-mahal', 'amer', 3623.2),
  ('jal-mahal', 'amer-road', 2523.0),
  ('jal-mahal', 'city-palace', 3794.5),
  ('jal-mahal', 'delhi-road', 7333.7),
  ('jal-mahal', 'hawa-mahal', 3777.6),
  ('jal-mahal', 'nahargarh-road', 3641.4),
  ('janta-colony', 'adarsh-nagar', 713.3),
  ('janta-colony', 'adarsh-nagar-circle', 918.9),
  ('janta-colony', 'jawahar-nagar', 438.6),
  ('janta-colony', 'moti-doongri-road', 1007.2),
  ('janta-colony', 'tilak-nagar', 705.0),
  ('janta-colony-main-road', 'adarsh-nagar', 891.4),
  ('janta-colony-main-road', 'janta-colony', 190.1),
  ('janta-colony-main-road', 'jawahar-nagar', 581.0),
  ('janta-colony-main-road', 'tilak-nagar', 876.7),
  ('jantar-mantar', 'bapu-bazaar', 665.1),
  ('jantar-mantar', 'city-palace', 140.7),
  ('jantar-mantar', 'hawa-mahal', 240.0),
  ('jantar-mantar', 'johri-bazaar', 414.9),
  ('jantar-mantar', 'surajpole', 892.3),
  ('jantar-mantar', 'tripolia-bazaar', 620.9),
  ('jawahar-circle', 'jln-marg', 817.8),
  ('jawahar-circle', 'lal-kothi', 3298.9),
  ('jawahar-circle', 'malviya-nagar', 1057.6),
  ('jawahar-circle', 'pratap-nagar', 2680.1),
  ('jawahar-circle', 'sanganer', 4495.7),
  ('jawahar-circle', 'tonk-road', 2065.7),
  ('jawahar-nagar', 'adarsh-nagar', 373.8),
  ('jawahar-nagar', 'janta-colony', 438.6),
  ('jawahar-nagar', 'moti-doongri-road', 891.5),
  ('jawahar-nagar', 'raja-park', 776.9),
  ('jawahar-nagar', 'tilak-nagar', 746.9),
  ('jhalana-doongri', 'bapu-nagar', null),
  ('jhalana-doongri', 'c-scheme', null),
  ('jhalana-doongri', 'durgapura', null),
  ('jhalana-doongri', 'moti-doongri-road', null),
  ('jhalana-doongri', 'tonk-road', null),
  ('jhotwara', 'jhotwara-industrial-area', 491.6),
  ('jhotwara', 'kalwar-road', 5046.5),
  ('jhotwara', 'kardhani', 766.0),
  ('jhotwara', 'murlipura', 1401.0),
  ('jhotwara', 'sikar-road', 1456.4),
  ('jhotwara', 'vishwakarma', 1764.4),
  ('jhotwara-industrial-area', 'jhotwara', 491.6),
  ('jhotwara-industrial-area', 'kalwar-road', 4963.9),
  ('jhotwara-industrial-area', 'sikar-road', 975.3),
  ('jhotwara-industrial-area', 'vishwakarma', 1728.0),
  ('jhotwara-industrial-area', 'vishwakarma-industrial-area', 1767.5),
  ('jln-marg', 'durgapura', 2481.6),
  ('jln-marg', 'jagatpura', 4051.5),
  ('jln-marg', 'jawahar-circle', 817.8),
  ('jln-marg', 'malviya-nagar', 756.0),
  ('jln-marg', 'sitapura', 8805.1),
  ('jln-marg', 'tonk-road', 2227.9),
  ('johri-bazaar', 'badi-chaupar', 267.8),
  ('johri-bazaar', 'bapu-bazaar', 336.1),
  ('johri-bazaar', 'city-palace', 535.7),
  ('johri-bazaar', 'hawa-mahal', 319.4),
  ('johri-bazaar', 'ramganj', 834.3),
  ('johri-bazaar', 'tripolia-bazaar', 675.4),
  ('jyothi-nagar', 'ajmer-road', 1269.5),
  ('jyothi-nagar', 'gopalpura-bypass', 9288.0),
  ('jyothi-nagar', 'nirman-nagar', 597.7),
  ('jyothi-nagar', 'queens-road', 747.5),
  ('jyothi-nagar', 'shyam-nagar', 1107.4),
  ('jyothi-nagar', 'sodala', 1802.2),
  ('kalwar-road', 'jhotwara', 5046.5),
  ('kalwar-road', 'jhotwara-industrial-area', 4963.9),
  ('kalwar-road', 'kardhani', 5749.2),
  ('kalwar-road', 'murlipura', 6434.0),
  ('kalwar-road', 'vishwakarma', 3282.1),
  ('kanakpura', 'amer-road', 7249.6),
  ('kanakpura', 'city-palace', 7988.5),
  ('kanakpura', 'hawa-mahal', 8366.4),
  ('kanakpura', 'jal-mahal', 9179.3),
  ('kanakpura', 'nahargarh-road', 6842.9),
  ('kardhani', 'jhotwara', 766.0),
  ('kardhani', 'kalwar-road', 5749.2),
  ('kardhani', 'murlipura', 698.4),
  ('kardhani', 'sikar-road', 1363.9),
  ('kardhani', 'vishwakarma', 2480.0),
  ('khole-ke-hanuman-ji-area', 'amer-road', null),
  ('khole-ke-hanuman-ji-area', 'delhi-road', null),
  ('khole-ke-hanuman-ji-area', 'jal-mahal', null),
  ('khole-ke-hanuman-ji-area', 'nahargarh', null),
  ('kishanpole-bazaar', 'bapu-bazaar', 675.5),
  ('kishanpole-bazaar', 'chandpole', 489.7),
  ('kishanpole-bazaar', 'nehru-bazaar', null),
  ('kishanpole-bazaar', 'topkhana-desh', 1765.1),
  ('kishanpole-bazaar', 'tripolia-bazaar', 545.9),
  ('kukas', 'agra-road', 9282.5),
  ('kukas', 'amer', 2853.5),
  ('kukas', 'delhi-road', 2480.9),
  ('kukas', 'nahargarh', 6109.2),
  ('lal-kothi', 'durgapura', 4447.8),
  ('lal-kothi', 'jagatpura', 5866.7),
  ('lal-kothi', 'jawahar-circle', 3298.9),
  ('lal-kothi', 'malviya-nagar', 2640.0),
  ('lal-kothi', 'mansarovar', 5253.5),
  ('lal-kothi', 'tonk-road', 3861.0),
  ('mahal-road', 'mansarovar-extension', 9461.7),
  ('mahal-road', 'new-sanganer-road', 6423.4),
  ('mahal-road', 'pratap-nagar', 5909.8),
  ('mahal-road', 'sitapura', 3305.4),
  ('mahal-road', 'tonk-road', 3480.3),
  ('mahapura', 'ajmer-road', 5264.5),
  ('mahapura', 'bagru', 14707.3),
  ('mahapura', 'bhankrota', 1459.6),
  ('mahapura', 'heerapura', 1420.9),
  ('malviya-nagar', 'durgapura', 1899.0),
  ('malviya-nagar', 'jagatpura', 3437.4),
  ('malviya-nagar', 'jawahar-circle', 1057.6),
  ('malviya-nagar', 'jln-marg', 756.0),
  ('malviya-nagar', 'mansarovar', 4595.6),
  ('malviya-nagar', 'tonk-road', 1517.5),
  ('mansarovar', 'ajmer-road', 4352.3),
  ('mansarovar', 'durgapura', 5653.4),
  ('mansarovar', 'malviya-nagar', 4595.6),
  ('mansarovar', 'mansarovar-extension', 1074.0),
  ('mansarovar', 'new-sanganer-road', 1969.9),
  ('mansarovar', 'shipra-path', 577.8),
  ('mansarovar-extension', 'mansarovar', 1074.0),
  ('mansarovar-extension', 'new-sanganer-road', 3043.9),
  ('mansarovar-extension', 'pratap-nagar', 3881.2),
  ('mansarovar-extension', 'sanganer', 7386.6),
  ('mansarovar-extension', 'shipra-path', 500.1),
  ('mi-road', 'c-scheme', 1765.2),
  ('mi-road', 'gopalbari', 1764.9),
  ('mi-road', 'hawa-mahal', 1769.4),
  ('mi-road', 'sindhi-camp', 2220.7),
  ('mi-road', 'station-road', 2456.7),
  ('mini-secretariat-complex', 'c-scheme', null),
  ('mini-secretariat-complex', 'gopalbari', null),
  ('mini-secretariat-complex', 'lal-kothi', null),
  ('mini-secretariat-complex', 'station-road', null),
  ('moti-doongri-road', 'adarsh-nagar', 600.9),
  ('moti-doongri-road', 'janta-colony', 1007.2),
  ('moti-doongri-road', 'jawahar-nagar', 891.5),
  ('moti-doongri-road', 'lal-kothi', 1154.3),
  ('moti-doongri-road', 'tilak-nagar', 378.2),
  ('murlipura', 'jhotwara', 1401.0),
  ('murlipura', 'jhotwara-industrial-area', 1512.5),
  ('murlipura', 'kalwar-road', 6434.0),
  ('murlipura', 'kardhani', 698.4),
  ('murlipura', 'sikar-road', 1908.9),
  ('nahargarh', 'amer', 6379.6),
  ('nahargarh', 'city-palace', 1561.5),
  ('nahargarh', 'jal-mahal', 3442.7),
  ('nahargarh', 'kukas', 6109.2),
  ('nahargarh', 'nahargarh-road', 366.9),
  ('nahargarh-road', 'amer-road', 1161.9),
  ('nahargarh-road', 'city-palace', 1255.9),
  ('nahargarh-road', 'delhi-road', 8657.1),
  ('nahargarh-road', 'jal-mahal', 3641.4),
  ('nahargarh-road', 'nahargarh', 366.9),
  ('nehru-bazaar', 'bapu-bazaar', null),
  ('nehru-bazaar', 'city-palace', null),
  ('nehru-bazaar', 'hawa-mahal', null),
  ('nehru-bazaar', 'topkhana-desh', null),
  ('nehru-bazaar', 'tripolia-bazaar', null),
  ('new-sanganer-road', 'mansarovar', 1969.9),
  ('new-sanganer-road', 'mansarovar-extension', 3043.9),
  ('new-sanganer-road', 'pratap-nagar', 1253.4),
  ('new-sanganer-road', 'sanganer', 4558.4),
  ('new-sanganer-road', 'shipra-path', 2546.5),
  ('nirman-nagar', 'ajmer-road', 1642.2),
  ('nirman-nagar', 'chitrakoot', 963.2),
  ('nirman-nagar', 'queens-road', 1329.1),
  ('nirman-nagar', 'shyam-nagar', 568.6),
  ('nirman-nagar', 'sodala', 1204.5),
  ('nirman-nagar', 'vaishali-nagar', 1871.6),
  ('officers-campus-extension', 'gandhi-path-west', null),
  ('officers-campus-extension', 'nirman-nagar', null),
  ('officers-campus-extension', 'queens-road', null),
  ('officers-campus-extension', 'vaishali-nagar', null),
  ('panchyawala', 'gopalpura-bypass', 12974.2),
  ('panchyawala', 'jyothi-nagar', 3707.5),
  ('panchyawala', 'mansarovar', 7924.9),
  ('panchyawala', 'nirman-nagar', 4280.4),
  ('panchyawala', 'sodala', 5450.3),
  ('pratap-nagar', 'jagatpura', 4763.1),
  ('pratap-nagar', 'malviya-nagar', 3725.9),
  ('pratap-nagar', 'sanganer', 3507.3),
  ('pratap-nagar', 'sitapura', 8495.4),
  ('pratap-nagar', 'tonk-road', 4214.9),
  ('pratap-nagar-sector-1', 'jagatpura', null),
  ('pratap-nagar-sector-1', 'mahal-road', null),
  ('pratap-nagar-sector-1', 'new-sanganer-road', null),
  ('pratap-nagar-sector-1', 'sanganer', null),
  ('pratap-nagar-sector-1', 'sitapura', null),
  ('purani-basti', 'chandpole', 838.0),
  ('purani-basti', 'hawa-mahal', 1792.0),
  ('purani-basti', 'johri-bazaar', 1765.0),
  ('purani-basti', 'ramganj', 2532.1),
  ('queens-road', 'ajmer-road', 1347.2),
  ('queens-road', 'chitrakoot', 370.0),
  ('queens-road', 'gandhi-path-west', 1595.3),
  ('queens-road', 'nirman-nagar', 1329.1),
  ('queens-road', 'shyam-nagar', 1769.1),
  ('queens-road', 'vaishali-nagar', 675.5),
  ('raja-park', 'adarsh-nagar', 486.4),
  ('raja-park', 'janta-colony', 1181.9),
  ('raja-park', 'jawahar-nagar', 776.9),
  ('raja-park', 'raja-park-market', 105.2),
  ('raja-park', 'tilak-nagar', 1026.0),
  ('raja-park-market', 'adarsh-nagar', 586.3),
  ('raja-park-market', 'jawahar-nagar', 882.0),
  ('raja-park-market', 'raja-park', 105.2),
  ('raja-park-market', 'tilak-nagar', 1103.5),
  ('ramchandrapura', 'bagru', 15388.6),
  ('ramchandrapura', 'heerapura', 747.5),
  ('ramchandrapura', 'mahapura', 698.8),
  ('ramchandrapura', 'vishwakarma', 7030.5),
  ('ramganj', 'bapu-bazaar', 856.0),
  ('ramganj', 'city-palace', 1354.4),
  ('ramganj', 'ghat-gate', 382.8),
  ('ramganj', 'hawa-mahal', 1025.1),
  ('ramganj', 'johri-bazaar', 834.3),
  ('ramganj', 'surajpole', 334.4),
  ('sanganer', 'new-sanganer-road', 4558.4),
  ('sanganer', 'pratap-nagar', 3507.3),
  ('sanganer', 'shipra-path', 6897.1),
  ('sanganer', 'sitapura', 5223.0),
  ('sanganer', 'tonk-road', 4384.1),
  ('sanganeri-gate', 'bapu-bazaar', 244.6),
  ('sanganeri-gate', 'hawa-mahal', 864.9),
  ('sanganeri-gate', 'johri-bazaar', 545.9),
  ('sanganeri-gate', 'ramganj', 783.0),
  ('sanganeri-gate', 'surajpole', 558.9),
  ('shipra-path', 'mansarovar', 577.8),
  ('shipra-path', 'mansarovar-extension', 500.1),
  ('shipra-path', 'new-sanganer-road', 2546.5),
  ('shipra-path', 'sanganer', 6897.1),
  ('shyam-nagar', 'ajmer-road', 2208.4),
  ('shyam-nagar', 'gopalpura-bypass', 8510.5),
  ('shyam-nagar', 'nirman-nagar', 568.6),
  ('shyam-nagar', 'sodala', 819.4),
  ('sikar-road', 'jhotwara', 1456.4),
  ('sikar-road', 'kardhani', 1363.9),
  ('sikar-road', 'murlipura', 1908.9),
  ('sikar-road', 'vishwakarma', 2235.9),
  ('sikar-road', 'vishwakarma-industrial-area', 2044.8),
  ('sindhi-camp', 'city-palace', 3229.7),
  ('sindhi-camp', 'gopalbari', 813.7),
  ('sindhi-camp', 'mi-road', 2220.7),
  ('sindhi-camp', 'station-road', 506.5),
  ('sindhi-camp', 'vidyadhar-nagar', 2156.9),
  ('sitapura', 'jagatpura', 4788.3),
  ('sitapura', 'jln-marg', 8805.1),
  ('sitapura', 'malviya-nagar', 8222.1),
  ('sitapura', 'pratap-nagar', 8495.4),
  ('sitapura', 'sanganer', 5223.0),
  ('sitapura', 'tonk-road', 6783.4),
  ('sodala', 'ajmer-road', 2657.7),
  ('sodala', 'gopalpura-bypass', 7696.2),
  ('sodala', 'jyothi-nagar', 1802.2),
  ('sodala', 'nirman-nagar', 1204.5),
  ('sodala', 'shyam-nagar', 819.4),
  ('station-road', 'c-scheme', 3466.3),
  ('station-road', 'gopalbari', 758.9),
  ('station-road', 'mi-road', 2456.7),
  ('station-road', 'sindhi-camp', 506.5),
  ('surajpole', 'bapu-bazaar', 558.9),
  ('surajpole', 'city-palace', 1024.5),
  ('surajpole', 'hawa-mahal', 712.5),
  ('surajpole', 'jantar-mantar', 892.3),
  ('surajpole', 'ramganj', 334.4),
  ('tilak-nagar', 'adarsh-nagar', 616.6),
  ('tilak-nagar', 'janta-colony', 705.0),
  ('tilak-nagar', 'jawahar-nagar', 746.9),
  ('tilak-nagar', 'moti-doongri-road', 378.2),
  ('tilak-nagar', 'raja-park', 1026.0),
  ('topkhana-desh', 'chandpole', 2252.1),
  ('topkhana-desh', 'city-palace', 1780.5),
  ('topkhana-desh', 'hawa-mahal', 1450.9),
  ('topkhana-desh', 'nehru-bazaar', null),
  ('topkhana-desh', 'tripolia-bazaar', 1817.5),
  ('tripolia-bazaar', 'bapu-bazaar', 584.8),
  ('tripolia-bazaar', 'chandpole', 711.0),
  ('tripolia-bazaar', 'city-palace', 577.7),
  ('tripolia-bazaar', 'hawa-mahal', 793.5),
  ('tripolia-bazaar', 'johri-bazaar', 675.4),
  ('tripolia-bazaar', 'topkhana-desh', 1817.5),
  ('vidyadhar-nagar', 'agra-road', 6990.8),
  ('vidyadhar-nagar', 'delhi-road', 8686.3),
  ('vidyadhar-nagar', 'jal-mahal', 6478.3),
  ('vidyadhar-nagar', 'nahargarh', 3303.3),
  ('vidyadhar-nagar', 'sindhi-camp', 2156.9),
  ('vishwakarma', 'jhotwara-industrial-area', 1728.0),
  ('vishwakarma', 'kalwar-road', 3282.1),
  ('vishwakarma', 'sikar-road', 2235.9),
  ('vishwakarma', 'vishwakarma-industrial-area', 506.5),
  ('world-trade-park', 'jawahar-circle', 1192.1),
  ('world-trade-park', 'jln-marg', 408.6),
  ('world-trade-park', 'malviya-nagar', 703.5),
  ('world-trade-park', 'tonk-road', 2216.5)
) as v(slug1, slug2, distance_meters)
join public.localities l1 on l1.slug = v.slug1 and l1.city_id = (select id from public.cities where slug = 'jaipur')
join public.localities l2 on l2.slug = v.slug2 and l2.city_id = (select id from public.cities where slug = 'jaipur')
on conflict (locality_id, neighbor_locality_id) do update set
  distance_meters = excluded.distance_meters, method = excluded.method;

-- 2 localities had no source-derived neighbors -- computed
-- fallback (method='computed', <=3km): 18 rows.
insert into public.locality_neighbors (locality_id, neighbor_locality_id, distance_meters, method)
select l1.id, l2.id, v.distance_meters, 'computed'
from (values
  ('vaishali-nagar', 'amrapali-circle', 213.5),
  ('vaishali-nagar', 'chitrakoot', 949.9),
  ('vaishali-nagar', 'gandhi-path-west', 1130.6),
  ('vaishali-nagar', 'jyothi-nagar', 1276.8),
  ('vaishali-nagar', 'kalwar-road', 2911.9),
  ('vaishali-nagar', 'nirman-nagar', 1871.6),
  ('vaishali-nagar', 'panchyawala', 2603.5),
  ('vaishali-nagar', 'queens-road', 675.5),
  ('vaishali-nagar', 'shyam-nagar', 2373.6),
  ('vaishali-nagar', 'vishwakarma', 2844.6),
  ('vishwakarma-industrial-area', 'gandhi-path-west', 2467.9),
  ('vishwakarma-industrial-area', 'jhotwara', 1936.3),
  ('vishwakarma-industrial-area', 'jhotwara-industrial-area', 1767.5),
  ('vishwakarma-industrial-area', 'kanakpura', 2708.6),
  ('vishwakarma-industrial-area', 'kardhani', 2572.2),
  ('vishwakarma-industrial-area', 'panchyawala', 1809.5),
  ('vishwakarma-industrial-area', 'sikar-road', 2044.8),
  ('vishwakarma-industrial-area', 'vishwakarma', 506.5)
) as v(slug1, slug2, distance_meters)
join public.localities l1 on l1.slug = v.slug1 and l1.city_id = (select id from public.cities where slug = 'jaipur')
join public.localities l2 on l2.slug = v.slug2 and l2.city_id = (select id from public.cities where slug = 'jaipur')
on conflict (locality_id, neighbor_locality_id) do nothing;
