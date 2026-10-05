-- Hardening (5 Oct 2026 audit): remove table privileges nothing needs.
--
-- Supabase's default grants gave anon and authenticated INSERT/UPDATE/DELETE
-- (plus TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) on every table in public. Row-level
-- security was therefore the ONLY thing standing between an anonymous API key
-- holder and a write — one permissive policy added by mistake would have been an
-- open door. Every policy was reviewed on 5 Oct 2026: writes already require
-- is_staff() or row ownership (auth.uid()), which an anonymous caller can never
-- satisfy, so this migration changes no behaviour — it removes the second
-- failure mode.
--
--  * anon: loses all writes, except INSERT on the three tables whose policies
--    deliberately accept anonymous rows (analytics_events, events, update_reports).
--  * authenticated: keeps INSERT/UPDATE/DELETE (RLS policies gate them) but loses
--    TRUNCATE (not subject to RLS; held on public.profiles) and the unused
--    REFERENCES/TRIGGER/MAINTAIN.
--
-- Extension-owned relations (spatial_ref_sys, geometry_columns, geography_columns)
-- are skipped: owned by another role and already without public write grants.
--
-- ROLLBACK (restores Supabase's defaults):
--   grant insert, update, delete, truncate, references, trigger, maintain
--     on all tables in schema public to anon, authenticated;
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and pg_get_userbyid(c.relowner) = 'postgres'
  loop
    execute format(
      'revoke insert, update, delete, truncate, references, trigger, maintain on %s from anon',
      r.rel
    );
    execute format(
      'revoke truncate, references, trigger, maintain on %s from authenticated',
      r.rel
    );
  end loop;
end
$$;

grant insert on public.analytics_events, public.events, public.update_reports to anon;
