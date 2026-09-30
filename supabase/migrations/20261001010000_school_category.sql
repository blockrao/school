-- School Category from UDISE (30 Sep 2026)
--
-- Adds schools.school_category: UDISE's own categorical label for a school's
-- grade span/structure (e.g. "Primary with Upper Primary", "Pr. with Up.Pr.
-- Sec. and H.Sec."). Distinct from min_class/max_class (which already encode
-- the numeric grade range) — this is UDISE's own administrative category,
-- useful as a stable, government-recognized label rather than something we
-- derive ourselves from the class range.
--
-- Prompted by an audit (session of 30 Sep 2026, see docs/ops/implementation-log.md)
-- that found this field fully populated in the UDISE source_records payload
-- for all 6,914 matched schools (schCategoryDesc, 9 distinct values) but never
-- promoted to a column — same class of gap as address_state before this
-- session's fix.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20261001010000_school_category.sql --confirm`.

alter table public.schools
  add column if not exists school_category text;

comment on column public.schools.school_category is
  'UDISE''s own categorical label for grade-span/structure, e.g. "Primary '
  'with Upper Primary", "Pr. with Up.Pr. Sec. and H.Sec.". Sourced from '
  'source_records.payload->raw->reportCard->>schCategoryDesc for UDISE-'
  'matched schools (match_method=udise_direct_lookup). Distinct from '
  'min_class/max_class, which already encode the numeric grade range — '
  'this is UDISE''s own administrative category label, not derived.';

-- Backfill from the existing UDISE source_records payload (6,914 schools)
update public.schools s
set school_category = sr.payload->'raw'->'reportCard'->>'schCategoryDesc',
    data_quality_flags = coalesce(s.data_quality_flags, '{}'::jsonb)
      || jsonb_build_object('school_category', 1),
    enriched_at = now()
from public.source_records sr
join public.sources src on src.id = sr.source_id
where src.code = 'udise'
  and sr.matched_school_id = s.id
  and sr.payload->'raw'->'reportCard'->>'schCategoryDesc' is not null;
