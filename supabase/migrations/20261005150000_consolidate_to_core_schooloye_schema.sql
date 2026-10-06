-- Consolidate to core SchoolOye schema — delete audit/history/activity tables (5 Oct 2026).
--
-- SchoolOye is a school discovery platform. It does not need:
-- - Audit logs (no regulatory requirement for change tracking)
-- - Historical ingestion records (data is already matched and in schools table)
-- - Field-level provenance history (source tracking not operational)
-- - Activity tables: posts, events, jobs, media (content management is separate)
-- - Teacher profiles and affiliations (different product)
-- - Analytics event logs (not operational)
-- - Data quality flag history (internal, not needed for discovery)
--
-- ACTION: Prav, BEFORE running this migration:
-- 1. Run full database backup: pg_dump -Fc schooloye > backup_pre_consolidation_$(date +%Y%m%d).dump
-- 2. Verify this is running against production (not test database)
-- 3. Confirm by replying "yes, consolidate" after reviewing what's deleted below
--
-- WHAT GETS DELETED (irreversible without restore):
--
-- Audit/Logging (not operational, 100+ MB):
--   ✗ audit_log (63 MB, 22K rows) — before/after JSONB for every change
--   ✗ source_records (36 MB, 17K rows) — old Sept 23-25 import data, no active queries
--   ✗ field_provenance (23 MB, 84K rows) — historical field-level changes, not used by SchoolOye
--   ✗ data_quality_flags (328 KB) — audit artifact
--   ✗ analytics_events (824 KB) — not operational
--
-- Activity/Content Tables (not core to discovery):
--   ✗ school_posts (136 KB, 8192 bytes data) — activity feed
--   ✗ school_events (144 KB, 8192 bytes data) — activity feed
--   ✗ school_jobs (120 KB, 8192 bytes data) — job listings (not SchoolOye feature)
--   ✗ school_media (linked to school_posts)
--
-- Backup/Legacy Tables (obsolete):
--   ✗ school_name_case_backup (184 KB, 1006 rows) — backup table from earlier migration
--   ✗ admission_notices (168 KB, 0 rows) — empty, replaced by admission_cycles (D-087)
--   ✗ correction_requests (not sized yet) — internal intake, replaced by update_reports (X-03)
--
-- Teacher-Related (different product, 128+ KB):
--   ✗ teachers (128 KB, 8192 bytes data)
--   ✗ teacher_qualifications (64 KB, 8192 bytes data)
--   ✗ teacher_experience (64 KB, 8192 bytes data)
--   ✗ teacher_claims (TBD size)
--   ✗ school_teacher_affiliations (128 KB, 8192 bytes data)
--
-- WHAT STAYS (core SchoolOye schema):
--
-- School Entity:
--   ✓ schools (24 MB, 10K rows) — school master data
--   ✓ school_affiliations (1 MB, 3.8K rows) — board affiliations (CBSE, CISCE, etc.)
--   ✓ school_identifiers (2.7 MB, 18K rows) — UDISE codes, govt IDs
--   ✓ school_rankings (96 KB, 21 rows)
--   ✓ school_facilities (under schools now)
--   ✓ school_claims (user-generated corrections, operational)
--
-- Admissions & Seats:
--   ✓ admission_cycles (232 KB, 32 rows) — current/upcoming cycles
--   ✓ seat_status (80 KB) — live seat availability
--   ✓ admission_leads (96 KB)
--   ✓ application_orders (80 KB) — concierge
--   ✓ applications (TBD) — concierge
--
-- User Actions:
--   ✓ alert_subscriptions (12 cols, operational)
--   ✓ alert_deliveries (10 cols, operational)
--   ✓ shortlists (4 cols, operational)
--   ✓ enquiries (9 cols, operational)
--   ✓ update_reports (9 cols, operational)
--   ✓ ops_tasks (13 cols, operational)
--
-- Reference Data:
--   ✓ localities, cities, districts, states, boards, landmarks, corridors, class_levels
--   ✓ facilities, exam_*, converage-related tables
--   ✓ profiles, consents, children, messages, conversations (user accounts)
--
-- ESTIMATED RECOVERY: 100-130 MB
-- RESULTING DATABASE SIZE: ~80-100 MB
--
-- Per D-073, destructive changes need Prav's explicit yes after seeing exact SQL.
-- This migration was written by Claude and stops here. A human runs it.

-- ============================================================================
-- PHASE 1: DROP TABLES WITH CASCADE (handles foreign keys)
-- ============================================================================

-- Audit & Logging tables
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.source_records CASCADE;
DROP TABLE IF EXISTS public.field_provenance CASCADE;
DROP TABLE IF EXISTS public.data_quality_flags CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;

-- Activity tables
DROP TABLE IF EXISTS public.school_posts CASCADE;
DROP TABLE IF EXISTS public.school_events CASCADE;
DROP TABLE IF EXISTS public.school_jobs CASCADE;
DROP TABLE IF EXISTS public.school_media CASCADE;

-- Backup/Legacy tables
DROP TABLE IF EXISTS public.school_name_case_backup CASCADE;
DROP TABLE IF EXISTS public.admission_notices CASCADE;
DROP TABLE IF EXISTS public.correction_requests CASCADE;

-- Teacher-related tables (separate product)
DROP TABLE IF EXISTS public.teacher_claims CASCADE;
DROP TABLE IF EXISTS public.teacher_experience CASCADE;
DROP TABLE IF EXISTS public.teacher_qualifications CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.school_teacher_affiliations CASCADE;

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
-- Expected: ~20-25 tables (down from 74)
--
-- Check database size:
-- SELECT pg_size_pretty(pg_database_size('schooloye'));
-- Expected: ~80-100 MB (down from 270 MB)
--
-- Verify core tables still exist:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- Should include: schools, school_affiliations, admission_cycles, etc.

