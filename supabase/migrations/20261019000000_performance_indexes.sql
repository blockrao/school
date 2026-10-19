-- Performance Critical: Missing Indexes on Filter Columns (19 Oct 2026, Prav)
--
-- Audit found all filter queries doing full table scans on 8,000+ schools.
-- These indexes are foundational for city listing, locality filtering, and nearby schools.
--
-- Impact: Query latency drops from O(n) full-table-scan to O(log n) index lookup.
-- At 10 concurrent requests, this prevents 10,000 row scans/second.

-- City listing: listPublicSchoolsByCity() and related
create index if not exists idx_schools_city_id on schools(city_id);

-- Locality listing: listPublicSchoolsByLocality()
create index if not exists idx_schools_locality_id on schools(locality_id);

-- Pincode-based fallback: listPublicSchoolsByPincode()
create index if not exists idx_schools_pincode on schools(pincode);

-- Nearby schools (geospatial): listPublicSchoolsNear() with ST_DWithin()
-- GIST index for PostGIS distance queries
create index if not exists idx_schools_location_gist on schools using gist(location);

-- Future: status-based filtering (published schools only)
create index if not exists idx_schools_status on schools(status);

-- Board affiliation (new enrichment field) for board hub pages
create index if not exists idx_schools_board_affiliation on schools(board_affiliation);
