-- Dedicated, minimal-privilege role for payment confirmation (DATABASE_URL_PAYMENTS).
--
-- NOT applied automatically. Review, replace the password placeholder below,
-- then apply by hand (mirrors claude_ro in 20260924160606_readonly_role.sql):
--   psql "$DATABASE_URL" -f supabase/migrations/20260925102635_payments_service_role.sql
--
-- This role owns nothing and can read nothing — it exists solely so
-- src/lib/db/payments-role.ts can call `select mark_order_paid($1, $2)` from a
-- webhook/staff action without going through `authenticated` (which must never be
-- able to mark its own order paid). EXECUTE on mark_order_paid is granted in
-- 20260925102636_application_help_functions.sql, once the function exists.

CREATE ROLE payments_service WITH LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_BEFORE_APPLYING';

GRANT CONNECT ON DATABASE postgres TO payments_service;
GRANT USAGE ON SCHEMA public TO payments_service;

-- No table grants, no other schema access, not a superuser. Everything this role
-- can ever do is scoped to whatever mark_order_paid's own SQL body does.
