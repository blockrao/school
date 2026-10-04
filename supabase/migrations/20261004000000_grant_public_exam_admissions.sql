-- Backfill (4 Oct 2026): grant for api.public_exam_admissions, step 2 of the
-- P0 backfill in docs/spec/exams.md §4 (step 1 is db/views/110_public_exam_admissions.sql).
-- The grant already exists live (applied via the untracked
-- tighten_exams_grants_to_select_only / extend_public_exam_admissions_view_v2
-- changes on 26 Sep 2026 — see supabase_migrations.schema_migrations, which
-- has no corresponding file in this repo). GRANT is idempotent, so re-running
-- this is a safe no-op; it exists so the grant has a committed record.
grant select on api.public_exam_admissions to anon, authenticated;
