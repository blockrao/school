-- Week 1: Denormalization + Composite Indexes for Scale
-- Prav: 2026-10-19
--
-- Goal: Prepare SchoolOye for 10,000+ schools with 2-20 cities and thousands of daily users
-- This migration adds the missing denormalized column and 6 performance indexes
--
-- Non-blocking: all changes are additive (new columns, new indexes, triggers on new column)
-- No existing queries break. Existing data is backfilled once.

-- ============================================================================
-- 1. ADD DENORMALIZED COLUMN: active_admission_count
-- ============================================================================
-- Stores the count of active admission_cycles for each school.
-- This eliminates a GROUP BY + COUNT subquery on every city list page.
-- Maintained via trigger on admission_cycles changes.

ALTER TABLE public.schools ADD COLUMN active_admission_count smallint DEFAULT 0;

COMMENT ON COLUMN public.schools.active_admission_count IS
  'Denormalized count of active admission_cycles for this school (status IN [upcoming,open,closing_soon]). Maintained via trigger on admission_cycles changes. Enables listing pages to sort/filter by active admissions without subqueries.';

-- ============================================================================
-- 2. CREATE 6 COMPOSITE INDEXES
-- ============================================================================
-- These eliminate the single-column index limitations and enable fast range scans
-- Index order matters: filter columns first (equality), then sort columns
--
-- Estimates (from optimization strategy):
-- - Index 2-4: 100x speedup on most queries
-- - Index 5: 50x speedup on sorting by rating
-- - Index 6: 25x speedup on filtering by news + location

-- Index 1: City list page with active admissions count (most common query)
CREATE INDEX idx_schools_city_status_admissions
  ON public.schools (city_id, status, active_admission_count DESC)
  WHERE city_id IS NOT NULL AND status = 'published';

COMMENT ON INDEX idx_schools_city_status_admissions IS
  'Optimizes: list schools by city, sorted by active admission count (no subquery needed)';

-- Index 2: Locality filter + name sort (used on /city/locality pages)
CREATE INDEX idx_schools_city_locality_name
  ON public.schools (city_id, locality_id, name_en)
  WHERE city_id IS NOT NULL AND locality_id IS NOT NULL AND status = 'published';

COMMENT ON INDEX idx_schools_city_locality_name IS
  'Optimizes: list schools by city+locality, sorted alphabetically (cursor pagination)';

-- Index 3: District + status + rating (for regional filters + sorting by rating)
CREATE INDEX idx_schools_district_status_rating
  ON public.schools (district_id, status, rating DESC)
  WHERE district_id IS NOT NULL AND status = 'published';

COMMENT ON INDEX idx_schools_district_status_rating IS
  'Optimizes: list schools by district, sorted by rating (no subquery for avg rating needed)';

-- Index 4: Cursor pagination compound key (name_en, id for tuple comparison)
CREATE INDEX idx_schools_city_name_id
  ON public.schools (city_id, name_en, id)
  WHERE status = 'published';

COMMENT ON INDEX idx_schools_city_name_id IS
  'Optimizes: cursor-based pagination on city list pages using tuple comparison (name, id) > (cursor_name, cursor_id)';

-- Index 5: Sort by rating on city view (frequent: "Top schools in Gurgaon")
CREATE INDEX idx_schools_city_rating
  ON public.schools (city_id, rating DESC NULLS LAST)
  WHERE city_id IS NOT NULL AND status = 'published' AND rating IS NOT NULL;

COMMENT ON INDEX idx_schools_city_rating IS
  'Optimizes: sort schools by rating within a city without expensive sort operation';

-- Index 6: Recent schools (newest) by city (used on "New schools in X" queries)
CREATE INDEX idx_schools_city_created
  ON public.schools (city_id, created_at DESC)
  WHERE city_id IS NOT NULL AND status = 'published';

COMMENT ON INDEX idx_schools_city_created IS
  'Optimizes: sort schools by creation date within a city (for "newest schools" list)';

-- ============================================================================
-- 3. BACKFILL active_admission_count FOR EXISTING SCHOOLS
-- ============================================================================
-- This is idempotent: runs once, harmless to re-run if interrupted

UPDATE public.schools s
SET active_admission_count = (
  SELECT COUNT(*)
  FROM public.admission_cycles ac
  WHERE ac.school_id = s.id
    AND ac.status IN ('upcoming', 'open', 'closing_soon')
);

-- ============================================================================
-- 4. CREATE TRIGGER TO KEEP active_admission_count IN SYNC
-- ============================================================================
-- When an admission_cycle is inserted/updated/deleted, update the school's count
-- This prevents stale denormalized data

CREATE OR REPLACE FUNCTION update_school_admission_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When an admission_cycle changes, recalculate the count for that school
  UPDATE public.schools
  SET active_admission_count = (
    SELECT COUNT(*)
    FROM public.admission_cycles
    WHERE school_id = COALESCE(NEW.school_id, OLD.school_id)
      AND status IN ('upcoming', 'open', 'closing_soon')
  )
  WHERE id = COALESCE(NEW.school_id, OLD.school_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT: new admission cycle (count goes up)
CREATE TRIGGER tr_admission_cycles_insert_count
AFTER INSERT ON public.admission_cycles
FOR EACH ROW
EXECUTE FUNCTION update_school_admission_count();

-- Trigger on UPDATE: status changed (count may go up/down)
CREATE TRIGGER tr_admission_cycles_update_count
AFTER UPDATE ON public.admission_cycles
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_school_admission_count();

-- Trigger on DELETE: admission cycle removed (count goes down)
CREATE TRIGGER tr_admission_cycles_delete_count
AFTER DELETE ON public.admission_cycles
FOR EACH ROW
EXECUTE FUNCTION update_school_admission_count();

-- ============================================================================
-- 5. VERIFY MIGRATION SUCCESS
-- ============================================================================
-- Run these checks after migration to confirm:
-- - SELECT COUNT(*) FROM public.schools WHERE active_admission_count > 0;
--   (should show schools with active cycles)
-- - SELECT * FROM pg_stat_user_indexes WHERE schemaname='public' AND tablename='schools'
--   (should show 6 new indexes created, not yet used until queries reference them)
-- - EXPLAIN SELECT * FROM schools WHERE city_id=123 AND status='published' ORDER BY active_admission_count DESC LIMIT 20;
--   (should use idx_schools_city_status_admissions, not seq scan)

COMMENT ON FUNCTION update_school_admission_count() IS
  'Maintains active_admission_count denormalized column whenever admission_cycles table changes. Prevents stale counts.';
