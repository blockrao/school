-- Narrows `authenticated`'s grant on `enquiries` to what Flow 2.11 (Ask this
-- school, on the school page) actually uses. DESTRUCTIVE — REVOKE. Do not apply
-- without explicit sign-off.
--
-- 120_revoke_excess_grants.sql (now supabase/migrations/20260925093232_...) left
-- `enquiries` on its original full-ALL grant pending the flow that would define
-- what's needed. src/app/[locale]/school/[idSlug]/actions.ts now defines the real
-- shape: insert only — the app submits a question and shows a confirmation from
-- the values just submitted, never reads a row back. RLS already limits read/write
-- beyond that: enq_insert requires user_id = auth.uid(); enq_read allows the
-- submitter, the school's own members, or staff; enq_staff (update) is staff/
-- school-member only — the submitting parent was never able to update or delete a
-- row, so this grant already matches what RLS would allow regardless.

revoke all privileges on enquiries from authenticated;

grant insert on enquiries to authenticated;
