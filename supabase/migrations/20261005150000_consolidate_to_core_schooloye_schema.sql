-- Clean up scraping & audit overhead (5 Oct 2026).
--
-- Remove logging/tracking junk accumulated from data ingestion:
-- - audit_log: 63 MB of before/after JSONB snapshots (not needed for SchoolOye)
-- - source_records: 36 MB of old scraping/import data (data already matched to schools)
-- - field_provenance: 23 MB of field-level history tracking (operational overhead)
-- - data_quality_flags, analytics_events, school_name_case_backup, etc.: internal junk
--
-- KEEP: school_posts, school_events, school_jobs, teachers (their own features/products)
-- DELETE: Only the overhead/logs/scraping junk
--
-- ACTION: Prav, BEFORE running this migration:
-- 1. Run full database backup: pg_dump -Fc schooloye > backup_overhead_cleanup_$(date +%Y%m%d).dump
-- 2. Verify this is running against production (not test database)
-- 3. Confirm by replying "yes, run it" after reviewing what's deleted below
--
-- WHAT GETS DELETED (irreversible without restore):
--
-- Logging/Audit Overhead (122 MB):
--   ✗ audit_log (63 MB, 22K rows) — before/after JSONB for every change
--   ✗ source_records (36 MB, 17K rows) — old Sept 23-25 import scraping data
--   ✗ field_provenance (23 MB, 84K rows) — historical field-level tracking
--
-- Other Overhead:
--   ✗ data_quality_flags (328 KB) — internal audit artifact
--   ✗ analytics_events (824 KB) — event logging junk
--   ✗ school_name_case_backup (184 KB) — backup table from earlier migration
--   ✗ admission_notices (168 KB) — empty, replaced by admission_cycles
--   ✗ correction_requests (if exists) — internal intake, replaced by update_reports
--
-- WHAT STAYS (product features):
--
-- School Discovery:
--   ✓ schools (24 MB, 10K rows)
--   ✓ school_affiliations (1 MB, board info)
--   ✓ school_identifiers (2.7 MB, UDISE codes)
--   ✓ school_rankings (96 KB)
--   ✓ school_claims (user corrections)
--
-- Features (their own tables):
--   ✓ school_posts, school_events, school_jobs (content/feature tables)
--   ✓ teachers, teacher_qualifications, teacher_experience, school_teacher_affiliations
--   ✓ school_media (media storage)
--
-- Admissions:
--   ✓ admission_cycles, seat_status, admission_leads, application_orders, applications
--
-- User Actions:
--   ✓ alert_subscriptions, alert_deliveries, shortlists, enquiries, update_reports, ops_tasks
--
-- Reference Data:
--   ✓ localities, cities, districts, states, boards, exam_*, profiles, consents, etc.
--
-- ESTIMATED RECOVERY: 120-130 MB
-- RESULTING DATABASE SIZE: ~150-160 MB (with feature tables intact)
--
-- Per D-073, destructive changes need Prav's explicit yes after seeing exact SQL.
-- This migration was written by Claude and stops here. A human runs it.

-- ============================================================================
-- PHASE 1: DROP LOGGING/AUDIT OVERHEAD ONLY
-- ============================================================================

-- Logging & Audit tables (122 MB of scraping/overhead junk)
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.source_records CASCADE;
DROP TABLE IF EXISTS public.field_provenance CASCADE;

-- Other overhead
DROP TABLE IF EXISTS public.data_quality_flags CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.school_name_case_backup CASCADE;
DROP TABLE IF EXISTS public.admission_notices CASCADE;
DROP TABLE IF EXISTS public.correction_requests CASCADE;

-- Note: Keeping feature tables intact:
-- ✓ school_posts, school_events, school_jobs, school_media (content features)
-- ✓ teachers, teacher_qualifications, teacher_experience, school_teacher_affiliations (teacher feature)

-- ============================================================================
-- PHASE 2: CLEANUP & OPTIMIZE
-- ============================================================================

-- Reclaim space from deleted tables
VACUUM ANALYZE;

-- ============================================================================
-- VERIFICATION (informational only, doesn't execute in migration)
-- ============================================================================
--
-- After this migration runs, verify the schema:
--
-- SELECT COUNT(*) FROM information_schema.tables
-- WHERE table_schema = 'public';
-- Expected: ~65 tables (down from 74, removed 9 junk tables)
--
-- Check database size:
-- SELECT pg_size_pretty(pg_database_size('schooloye'));
-- Expected: ~150-160 MB (down from 270 MB, 120-130 MB recovered)
--
-- Verify feature tables still exist:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('school_posts', 'school_events', 'school_jobs', 'teachers')
-- ORDER BY tablename;
-- All four should be present (not deleted)
--
-- Verify junk tables are gone:
-- SELECT COUNT(*) FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND tablename IN ('audit_log', 'source_records', 'field_provenance', 'data_quality_flags');
-- Expected: 0

