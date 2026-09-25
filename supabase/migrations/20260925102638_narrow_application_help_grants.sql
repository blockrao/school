-- Narrows `authenticated`'s inherited full-ALL grant on the four Application Help
-- tables to exactly what Flow 3.12 uses now that order/application mutations go
-- through the SECURITY DEFINER functions in 20260925102636_application_help_functions.sql
-- instead of direct table grants. DESTRUCTIVE — REVOKE. Applied per explicit
-- sign-off (point 6 of the Apply plan).
--
--   - children: select/insert/update/delete — matches children_owner's existing
--     ALL policy exactly; a parent manages their own child profiles directly.
--   - documents: select/insert/delete — matches docs_owner; no update, replacing
--     a document is delete + re-upload, never an in-place edit.
--   - application_orders: select only — every write (create, save intake, mark
--     paid) goes through a function; a parent never has a reason to touch a row
--     directly.
--   - applications: select only — every write (approve) goes through
--     approve_application; staff writes (apps_staff_write) are untouched.
-- RLS itself is unchanged; this only removes privilege the app never exercises.

revoke all privileges on children, documents, application_orders, applications from authenticated;

grant select, insert, update, delete on children to authenticated;
grant select, insert, delete on documents to authenticated;
grant select on application_orders to authenticated;
grant select on applications to authenticated;

-- Additive, not destructive: products (name/price/GST — no PII) currently has no
-- grant at all for anon or authenticated, so the public landing page (7a) can't
-- show real pricing to a visitor who hasn't signed in yet. Plain catalog data,
-- same trust level as api.public_boards.
grant select on products to anon, authenticated;
