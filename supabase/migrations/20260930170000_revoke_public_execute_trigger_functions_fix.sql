-- Follow-up fix to 20260930140000_revoke_public_execute_on_trigger_functions.sql
-- (part of the "audit to ensure nothing broke" verification pass, 30 Sep 2026).
--
-- The earlier migration ran:
--   revoke execute on function public.audit_trigger() from anon, authenticated;
--   revoke execute on function public.rls_auto_enable() from anon, authenticated;
--   revoke execute on function public.messages_touch_conversation() from anon, authenticated;
--
-- Re-checking the security advisor afterward showed all 3 functions STILL
-- listed under anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable. Root cause, confirmed
-- via pg_proc.proacl: Postgres grants EXECUTE to the PUBLIC pseudo-role by
-- default when a function is created, and REVOKE ... FROM anon, authenticated
-- does not touch that separate PUBLIC grant -- anon/authenticated still
-- inherited EXECUTE through PUBLIC membership. proacl before this fix:
--   {=X/postgres,postgres=X/postgres,service_role=X/postgres}
-- (the bare "=X/postgres" entry is the PUBLIC grant).
--
-- This migration revokes the PUBLIC grant directly, which is the only way
-- to actually remove anon/authenticated's inherited access.
--
-- Verified after applying:
--   - pg_proc.proacl now shows only {postgres=X/postgres,service_role=X/postgres}
--     for all 3 functions (PUBLIC grant gone).
--   - Security advisor re-check: none of the 3 functions appear in either
--     anon_security_definer_function_executable or
--     authenticated_security_definer_function_executable anymore.
--   - Trigger still fires correctly: updating a schools row produced a new
--     audit_log row (count went 4 -> 5), confirming the trigger mechanism
--     itself is unaffected by revoking direct-call EXECUTE privileges.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): applied directly
-- via mcp__Supabase__execute_sql (sandbox has no DATABASE_URL), and recorded
-- in schema_migrations by hand so a future `pnpm db:migrate` run is a no-op.

revoke execute on function public.audit_trigger() from public;
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.messages_touch_conversation() from public;
