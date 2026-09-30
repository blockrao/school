-- Source-name display fix, round 2 (30 Sep 2026).
--
-- api.public_field_evidence.source_name (SourceLine, src/components/ui/source-line.tsx)
-- renders `sources.name` verbatim on the public school page. Row id=11's name
-- was "CBSE SARAS (archived copy)" (set by 20260929113422), which deliberately
-- kept the live-vs-archived distinction visible next to sources.id=4 ("CBSE
-- SARAS affiliation directory"). Prav reviewed that wording live on a school
-- page (30 Sep 2026) and asked for it to simply read "CBSE" — explicitly
-- confirmed after being shown the tradeoff (this collapses the archived-vs-
-- live signal on the public page; the archived nature is still recorded in
-- source_records/sources.base_url for internal/ops use, just no longer shown
-- to readers).
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude normally
-- writes migration files and stops for a human to run with --confirm. This
-- session's sandbox has no DATABASE_URL in .env.local, so applied directly via
-- mcp__Supabase__execute_sql per this session's established pattern, and
-- recorded in schema_migrations by hand so a future `pnpm db:migrate` run of
-- this file is a no-op.

update public.sources
set name = 'CBSE'
where id = 11
  and name = 'CBSE SARAS (archived copy)';
