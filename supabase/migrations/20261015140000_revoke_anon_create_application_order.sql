-- Tidy-up (15 Oct 2026): create_application_order is SECURITY DEFINER and
-- already raises 'not authenticated' when auth.uid() is null, so anon could
-- never create an order — but anon still held EXECUTE. Remove it so the grant
-- matches the intent. Other anon-executable SECURITY DEFINER functions
-- (is_staff, is_school_admin, is_school_member, current_user_role,
-- current_role_is) are RLS helpers and must stay callable.
--
-- Claude writes this file and stops; a human runs
-- `pnpm db:migrate 20261015140000_revoke_anon_create_application_order.sql --confirm`.
revoke execute on function public.create_application_order(text, uuid) from anon, public;
grant execute on function public.create_application_order(text, uuid) to authenticated;
