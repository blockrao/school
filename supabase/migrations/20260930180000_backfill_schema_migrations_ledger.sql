-- Backfill schema_migrations ledger gap found during the "check entire
-- supabase and queries again" re-audit (30 Sep 2026).
--
-- 22 real, non-idempotent migrations (20260925190809 through 20261001000000)
-- were already applied to the live database -- confirmed by checking their
-- target objects directly, e.g. public.school_jobs, public.admission_leads,
-- public.conversations/messages, and public.schools.enriched_at /
-- enrichment_sources / data_quality_flags all exist -- but were never
-- recorded in schema_migrations. Likely applied through the dashboard/CLI
-- before this session's convention of recording every apply took hold.
--
-- This is a real operational risk, not cosmetic: several of these files use
-- non-idempotent DDL (`create table ...` without `if not exists`, and
-- `create policy ...`, which has no IF NOT EXISTS form in Postgres at all).
-- A future `pnpm db:migrate --confirm` run would see these filenames
-- missing from schema_migrations, try to re-apply them against a database
-- that already has the objects, and fail with "relation/policy already
-- exists" -- likely aborting the whole migration run partway through.
--
-- Fix: backfill schema_migrations with these 22 filenames, using each
-- file's own YYYYMMDDHHMMSS timestamp prefix as applied_at (the standard
-- proxy for when a timestamped migration was meant to apply -- git blame
-- showed most of them landed in one bulk commit, which isn't a meaningful
-- per-file signal). ON CONFLICT DO NOTHING makes this safe to re-run.
--
-- Left alone, correctly: 00000000000000_baseline.sql,
-- 20260924160606_readonly_role.sql, and
-- 20260925102635_payments_service_role.sql are all explicitly header-marked
-- "NOT applied automatically" / "NEVER APPLY THIS FILE" -- by design, and
-- correctly absent from schema_migrations. After this backfill, every other
-- local migration file has a matching schema_migrations row.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): applied directly
-- via mcp__Supabase__execute_sql (sandbox has no DATABASE_URL), and recorded
-- in schema_migrations by hand (this file included, at the bottom) so a
-- future `pnpm db:migrate` run of any of these is a no-op.

insert into public.schema_migrations (filename, applied_at) values
('20260925190809_delete_my_account_function.sql', '2026-09-25 19:08:09+00'::timestamptz),
('20260926070059_school_member_roles_audit_and_rate_limits.sql', '2026-09-26 07:00:59+00'::timestamptz),
('20260926080618_fix_audit_trigger_for_tables_without_id_column.sql', '2026-09-26 08:06:18+00'::timestamptz),
('20260926092026_school_posts_news_and_pr.sql', '2026-09-26 09:20:26+00'::timestamptz),
('20260926092537_fix_school_posts_updated_at_search_path.sql', '2026-09-26 09:25:37+00'::timestamptz),
('20260926092821_teacher_direct_messaging.sql', '2026-09-26 09:28:21+00'::timestamptz),
('20260926095411_school_teacher_affiliations.sql', '2026-09-26 09:54:11+00'::timestamptz),
('20260926101721_optimize_school_teacher_affiliations_rls.sql', '2026-09-26 10:17:21+00'::timestamptz),
('20260926115231_optimize_rls_auth_uid_initplan.sql', '2026-09-26 11:52:31+00'::timestamptz),
('20260928175050_api_public_school_news.sql', '2026-09-28 17:50:50+00'::timestamptz),
('20260928175100_api_public_admission_updates.sql', '2026-09-28 17:51:00+00'::timestamptz),
('20260928175119_api_public_school_admissions_extend_dob_documents.sql', '2026-09-28 17:51:19+00'::timestamptz),
('20260929050000_events_and_news_depth.sql', '2026-09-29 05:00:00+00'::timestamptz),
('20260929060000_school_jobs.sql', '2026-09-29 06:00:00+00'::timestamptz),
('20260929065609_activity_admissions_v1_analytics_indexes.sql', '2026-09-29 06:56:09+00'::timestamptz),
('20260929070000_admission_leads.sql', '2026-09-29 07:00:00+00'::timestamptz),
('20260929090000_activity_admissions_v1.sql', '2026-09-29 09:00:00+00'::timestamptz),
('20260929120000_udise_enrichment_schema.sql', '2026-09-29 12:00:00+00'::timestamptz),
('20260929140519_gurugram_private_cbse_icse_board_from_udise.sql', '2026-09-29 14:05:19+00'::timestamptz),
('20260929174112_remove_launch_gate_from_public_areas.sql', '2026-09-29 17:41:12+00'::timestamptz),
('20260929235959_fix_public_schools_view_definition.sql', '2026-09-29 23:59:59+00'::timestamptz),
('20261001000000_enrichment_metadata.sql', '2026-10-01 00:00:00+00'::timestamptz)
on conflict (filename) do nothing;
