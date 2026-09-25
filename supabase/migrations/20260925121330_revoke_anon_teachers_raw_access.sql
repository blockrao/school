-- Fixes a mistake in 20260925114317_teachers_schema.sql: it granted anon
-- direct SELECT on the raw teachers/teacher_experience/teacher_qualifications
-- tables, relying on RLS to filter to published+listed rows. That's the wrong
-- pattern for this codebase — every other public read goes through an api.*
-- view (api.public_teachers, applied in 080_public_teachers.sql), and
-- pnpm verify:views treats ANY anon grant on a raw table as a failure
-- regardless of what RLS would filter, as defense in depth. Caught by
-- verify:views immediately after applying. DESTRUCTIVE — REVOKE. Not applied
-- without explicit sign-off, same rule as any other REVOKE this session,
-- even though this only reverts a mistake from a migration applied minutes
-- ago and nothing depends on the over-grant yet.

revoke select on teachers, teacher_experience, teacher_qualifications from anon;
