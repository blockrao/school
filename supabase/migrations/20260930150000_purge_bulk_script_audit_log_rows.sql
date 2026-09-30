-- Purge bulk-script audit_log rows, keep genuine user/staff audit trail
-- (30 Sep 2026).
--
-- Part of the database audit Prav asked for. audit_log had grown to 683MB /
-- 289,208 rows in 7 days, driven almost entirely by this session's bulk
-- enrichment/cleanup work (278,460 UPDATE events on schools alone) --
-- audit_trigger() snapshots the full before/after row on every DB change,
-- and every bulk-script UPDATE run via mcp__Supabase__execute_sql (service
-- role, no auth.uid()) got logged the same as a real user action.
--
-- Confirmed before deleting: only 4 of the 289,208 rows had a non-null
-- `actor` (real auth.uid()) -- all 4 are genuine profile UPDATEs from real
-- signed-in users on 26/27/29 Sep. Every other row was actor IS NULL,
-- i.e. service-role/script activity, not a real audit event. Deleted those
-- ~289,204 rows and ran VACUUM FULL to reclaim the disk space (table
-- dropped from 683MB to 48kB; the 4 genuine rows remain untouched).
--
-- This is a one-time cleanup, not a schema change, so nothing here is
-- re-runnable in the usual migration sense -- recorded in schema_migrations
-- purely so this session's convention of "every change gets a migration
-- file" holds, and so it's clear from git history what happened and why.
-- Retention going forward (whether to add an automatic purge/expiry job so
-- this doesn't reaccumulate) was explicitly left as a separate decision --
-- not part of this cleanup.
--
-- Explicitly confirmed by Prav (30 Sep 2026, via the "purge the bulk-script
-- rows only" option) after being shown the exact row/actor breakdown.

delete from public.audit_log where actor is null;
vacuum full public.audit_log;
