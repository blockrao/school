-- Read-only role for terminal-based introspection (DATABASE_URL_RO).
--
-- NOT applied automatically. Review, replace the password placeholder below,
-- then apply by hand:
--   psql "$DATABASE_URL" -f supabase/migrations/20260924160606_readonly_role.sql
--
-- DATABASE_URL (the postgres superuser connection) stays reserved for
-- scripts/db-migrate.mjs, run explicitly with --confirm. Everything else —
-- schema introspection, type generation, ad-hoc SELECT queries — should use
-- DATABASE_URL_RO with this role instead.

CREATE ROLE claude_ro WITH LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_BEFORE_APPLYING';

GRANT CONNECT ON DATABASE postgres TO claude_ro;
GRANT USAGE ON SCHEMA public TO claude_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_ro;

-- So tables created by future migrations are readable without a repeat grant.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO claude_ro;

-- No INSERT/UPDATE/DELETE, no DDL, no schema ownership, not a superuser —
-- claude_ro can only ever read.
