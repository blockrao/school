-- UDISE Enrichment Schema — School Contact & Address Structuring (29 Sep 2026).
--
-- Adds structured address components and principal name fields populated from
-- UDISE+ source data (source_records). These support the enhanced school detail
-- page display (entity-page.tsx Increment 11+).
--
-- Changes:
-- 1. Structured address fields: address_street, address_area, address_city,
--    address_district, address_state, address_state_code, address_pincode,
--    address_source (tracks which source filled each field)
-- 2. principal_name field extracted from about_en or UDISE data
-- 3. For display: address and pincode already exist; these complement them
--    with granular, queryable components for map display, filtering, and
--    location-based search.
--
-- No data migration in this file — values already populated via direct SQL
-- updates (see bulk enrichment in previous session context). This simply
-- formalizes the schema used by that enrichment.

alter table public.schools
  add column if not exists address_street text,
  add column if not exists address_area text,
  add column if not exists address_city text,
  add column if not exists address_district text,
  add column if not exists address_state text,
  add column if not exists address_state_code text,
  add column if not exists address_pincode text,
  add column if not exists address_source text,
  add column if not exists principal_name text;

comment on column public.schools.address_street is
  'Street/building address component from UDISE+ or manual entry. Structured '
  'sibling to address (unstructured text).';

comment on column public.schools.address_area is
  'Area/locality/ward name component from UDISE+. Complements address for '
  'structured geocoding.';

comment on column public.schools.address_city is
  'City name from UDISE+ district or manual entry.';

comment on column public.schools.address_district is
  'Administrative district name from UDISE+ reporting.';

comment on column public.schools.address_state is
  'State/province name (e.g. "Haryana", "Delhi").';

comment on column public.schools.address_state_code is
  'State two-letter code (e.g. "HR", "DL"). Matches national state master.';

comment on column public.schools.address_pincode is
  'Postal code/PIN from UDISE+. Duplicate of pincode column for queryable '
  'structure; deprecated in future if pincode migrates to a number type.';

comment on column public.schools.address_source is
  'Data source for address fields (e.g. "UDISE", "CBSE_SARAS", "manual"). '
  'Supports audit and re-enrichment decisions.';

comment on column public.schools.principal_name is
  'Name of school principal/headmaster from UDISE+ headMasterName or claim. '
  ' 100% coverage in current UDISE extract. Stored separately from about_en '
  'for queryability and API serialization.';

-- Index for state-level address queries and filters
create index if not exists schools_address_state_idx
  on public.schools (address_state_code)
  where address_state_code is not null;

-- Index for district-level queries (geographic rollup)
create index if not exists schools_address_district_idx
  on public.schools (address_district)
  where address_district is not null;
