-- Narrows `authenticated`'s grant on the two tables Alerts (Flow 2.9) actually
-- touches. DESTRUCTIVE — REVOKE. Do not apply without explicit sign-off.
--
-- 120_revoke_excess_grants.sql deliberately left `consents` and
-- `alert_subscriptions` on their original full-ALL grant (SELECT/INSERT/
-- UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) pending the flow that would
-- define what's actually needed. Now that src/app/[locale]/alerts/actions.ts
-- and src/app/[locale]/my/actions.ts exist, the real shape is known:
--   - consents: insert (record a new consent event) + update (withdrawal
--     sets withdrawn_at on the app's own row — never touches another
--     user's row, RLS still scopes every statement to auth.uid()).
--   - alert_subscriptions: select (check for an existing active row) +
--     insert (first subscribe) + update (re-subscribe changes class_codes;
--     unsubscribe sets active = false). No delete flow exists.
-- RLS (consents_self, alerts_owner — both auth.uid()-scoped) is unchanged;
-- this only removes privilege authenticated never exercises.

revoke all privileges on consents, alert_subscriptions from authenticated;

grant insert, update on consents to authenticated;
grant select, insert, update on alert_subscriptions to authenticated;
