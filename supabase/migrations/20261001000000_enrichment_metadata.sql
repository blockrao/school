-- Enrichment Metadata Tracking (1 Oct 2026)
--
-- Adds audit and freshness tracking to enrichment data. Enables:
-- - Visibility into when enrichment occurred (enriched_at)
-- - Which sources contributed to each school's enrichment (enrichment_sources)
-- - Data quality scoring for each enriched field (data_quality_flags)
-- - User-facing "data freshness" badges on entity pages
--
-- These columns complement the existing address_source field (which tracks
-- the source of the address specifically) by providing holistic enrichment
-- metadata across all UDISE/CBSE/external enrichments.
--
-- Populated retroactively via direct SQL (enrichment run from 29 Sep 2026)
-- for all schools with any enriched fields; new schools pick up values as
-- they are claimed or enriched.

alter table public.schools
  add column if not exists enriched_at timestamp with time zone,
  add column if not exists enrichment_sources text[],
  add column if not exists data_quality_flags jsonb;

comment on column public.schools.enriched_at is
  'When this school record was last enriched with UDISE, CBSE SARAS, or other '
  'external data sources. Null if not yet enriched. Supports "data freshness" '
  'display on public entity pages.';

comment on column public.schools.enrichment_sources is
  'Array of source codes that contributed to this school''s enrichment data. '
  'Example: {''UDISE'',''CBSE_SARAS''}. Empty array if not enriched. Supports '
  'multi-source transparency on entity pages.';

comment on column public.schools.data_quality_flags is
  'JSONB object with per-field quality/confidence scores. Example: '
  '{\"principal_name\": 0.95, \"address_street\": 0.87}. Values are 0.0-1.0 '
  'representing confidence. Null if no scoring applied. Enables conditional '
  'display of "verified" badges or quality warnings.';

-- Index for querying schools by enrichment recency
create index if not exists schools_enriched_at_idx
  on public.schools (enriched_at desc)
  where enriched_at is not null;

-- Index for filtering by enrichment sources (e.g., "which schools have UDISE?")
create index if not exists schools_enrichment_sources_idx
  on public.schools using gin (enrichment_sources)
  where enrichment_sources is not null;

-- Backfill: set enriched_at to 29 Sep 2026 for all schools with enriched fields
update public.schools
set enriched_at = '2026-09-29T00:00:00Z'
where
  principal_name is not null
  or address_street is not null
  or address_area is not null
  or address_city is not null
  or address_district is not null
  or address_state is not null
  or address_state_code is not null
  or udise_code is not null;

-- Backfill: set enrichment_sources based on which fields are populated
-- and the address_source indicator
update public.schools
set enrichment_sources = array_remove(
  array_cat(
    case when udise_code is not null then array['UDISE'] else array[]::text[] end,
    case when address_source = 'CBSE_SARAS' then array['CBSE_SARAS'] else array[]::text[] end
  ),
  null
)
where enriched_at is not null;

-- Backfill: set default quality scores (high confidence for UDISE data)
update public.schools
set data_quality_flags = jsonb_build_object(
  'principal_name', case when principal_name is not null then 0.95 else null end,
  'address_street', case when address_street is not null then 0.85 else null end,
  'address_area', case when address_area is not null then 0.85 else null end,
  'address_city', case when address_city is not null then 0.90 else null end,
  'address_state', case when address_state is not null then 0.95 else null end,
  'udise_code', case when udise_code is not null then 1.0 else null end
)
where enriched_at is not null;
