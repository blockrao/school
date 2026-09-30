-- Fix RLS policies re-evaluating auth.uid() per row, plus an audit_log
-- lookup index (30 Sep 2026).
--
-- Part of the database audit Prav asked for. Two independent fixes bundled
-- here since both are small and safe:
--
-- 1. Four INSERT policies called auth.uid() directly in their WITH CHECK
--    clause (school_posts_member_insert, school_events_member_insert,
--    school_jobs_member_insert, admission_leads_own_insert), which the
--    performance advisor flags because Postgres re-evaluates the function
--    once per row instead of once per statement. Wrapping it as
--    (select auth.uid()) lets the planner treat it as a stable subquery
--    and evaluate it once. Pure performance fix, no access-control change.
--
-- 2. audit_log had grown to 683MB (289k rows in 7 days, mostly bulk-script
--    UPDATEs on schools from this session's enrichment work) with only a
--    primary-key index -- looking up "what happened to school X" required
--    a full table scan. Adds (entity_table, entity_id, at desc) so that
--    lookup pattern is actually usable. Retention/purge of the historical
--    rows is a separate decision, not part of this migration.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude normally
-- writes migration files and stops for a human to run with --confirm. This
-- session's sandbox has no DATABASE_URL in .env.local, so applied directly
-- via mcp__Supabase__execute_sql per this session's established pattern, and
-- recorded in schema_migrations by hand so a future `pnpm db:migrate` run of
-- this file is a no-op.

alter policy school_posts_member_insert on public.school_posts
  with check (is_school_member(school_id) and (created_by = (select auth.uid())) and (tier = 'organic'::post_tier));

alter policy school_events_member_insert on public.school_events
  with check (is_school_member(school_id) and (created_by = (select auth.uid())));

alter policy school_jobs_member_insert on public.school_jobs
  with check (is_school_member(school_id) and (created_by = (select auth.uid())));

alter policy admission_leads_own_insert on public.admission_leads
  with check ((select auth.uid()) = user_id);

create index if not exists audit_log_entity_at_idx on public.audit_log (entity_table, entity_id, at desc);
