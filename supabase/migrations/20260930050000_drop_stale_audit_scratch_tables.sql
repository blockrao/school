-- Drop stale one-off scratch tables from the 29 Sep board-affiliation audit
-- (30 Sep 2026).
--
-- These six tables were created by hand, outside any migration (none of them
-- appear anywhere in supabase/migrations/ prior to this file), during the
-- board-affiliation baseline/coverage check on 29 Sep. None are referenced
-- anywhere in src/ — they were working scratch space for that one session,
-- not part of the live schema. Their content is fully superseded by what's
-- already properly stored in source_records / field_provenance /
-- school_affiliations, and the coverage/missing-affiliation snapshots are
-- now stale (coverage has changed several times since, including today).
--
-- - saras_mahendragarh (100 rows): raw scrape staged for the first
--   Mahendragarh CBSE-SARAS check, long since folded into source_records.
-- - schools_audit (2 rows) / schools_audit_summary (1 row): manual log lines
--   + rollup from that day's board-affiliation baseline count.
-- - schools_coverage_summary (32 rows): a frozen district-by-district
--   coverage snapshot from 29 Sep.
-- - schools_duplicates_by_affiliation (0 rows): already empty.
-- - schools_missing_affiliation (1,912 rows): a working list from that day,
--   also stale now.
--
-- Deliberately NOT dropping school_name_case_backup: that one is a
-- documented, intentional rollback safety net for the all_caps_school_names
-- migration (20260928170000), kept on Prav's call rather than assumed dead.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude normally
-- writes migration files and stops for a human to run with --confirm. This
-- session's sandbox has no DATABASE_URL in .env.local, so applied directly via
-- mcp__Supabase__execute_sql per this session's established pattern, and
-- recorded in schema_migrations by hand so a future `pnpm db:migrate` run of
-- this file is a no-op. Explicitly authorized by Prav (30 Sep 2026) after
-- reviewing what each table was and confirming none were live.

-- schools_audit_summary / schools_coverage_summary / schools_duplicates_by_affiliation /
-- schools_missing_affiliation turned out to be views (over schools_audit / schools),
-- not tables, when this was actually applied -- dropped as views, before the two
-- underlying base tables.
drop view if exists public.schools_audit_summary;
drop view if exists public.schools_coverage_summary;
drop view if exists public.schools_duplicates_by_affiliation;
drop view if exists public.schools_missing_affiliation;
drop table if exists public.saras_mahendragarh;
drop table if exists public.schools_audit;
