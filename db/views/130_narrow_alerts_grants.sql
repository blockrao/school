-- Narrows `authenticated`'s grant on the two tables Alerts (Flow 2.9) actually
-- touches. DESTRUCTIVE — REVOKE. Do not apply without explicit sign-off.
--
-- 120_revoke_excess_grants.sql deliberately left `consents` and
-- `alert_subscriptions` on their original full-ALL grant (SELECT/INSERT/
-- UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) pending the flow that would
-- define what's actually needed. Now that src/app/[locale]/alerts/actions.ts
-- exists, the real shape is known:
--   - consents: insert-only — the app records a consent event, never reads
--     or edits one back.
--   - alert_subscriptions: select (check for an existing active row) +
--     insert (first subscribe) + update (re-subscribe changes class_codes on
--     the existing row). No delete/unsubscribe flow exists yet.
-- RLS (consents_self, alerts_owner — both auth.uid()-scoped) is unchanged;
-- this only removes privilege authenticated never exercises.

revoke all privileges on consents, alert_subscriptions from authenticated;

grant insert on consents to authenticated;
grant select, insert, update on alert_subscriptions to authenticated;
