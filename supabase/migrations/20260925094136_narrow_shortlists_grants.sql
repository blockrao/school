-- Narrows `authenticated`'s grant on `shortlists` to what Flow 2.10 (Save/Remove,
-- /my/shortlist) actually uses. DESTRUCTIVE — REVOKE. Do not apply without explicit
-- sign-off.
--
-- 120_revoke_excess_grants.sql (now supabase/migrations/20260925093232_...) left
-- `shortlists` on its original full-ALL grant pending the flow that would define
-- what's needed. src/app/[locale]/my/shortlist/actions.ts and
-- src/lib/db/shortlist.ts now define the real shape:
--   - select: list a user's saved schools (/my/shortlist) and check saved-state
--     per school on every listing page.
--   - insert: Save.
--   - delete: Remove / un-save.
-- No update — child_id is never set from the UI. RLS (shortlists_owner,
-- auth.uid()-scoped) is unchanged; this only removes privilege authenticated never
-- exercises.

revoke all privileges on shortlists from authenticated;

grant select, insert, delete on shortlists to authenticated;
