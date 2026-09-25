-- staging.* is analysis-only: claude_ro can read it, nothing else can. Explicit
-- revoke first so this is correct even if PUBLIC ever picks up a stray grant.
revoke all on schema staging from public, anon, authenticated;
grant usage on schema staging to claude_ro;
grant select on staging.schools_with_level to claude_ro;
