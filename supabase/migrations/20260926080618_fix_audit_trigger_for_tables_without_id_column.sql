-- audit_trigger() assumed every audited table has an `id` column (true for
-- schools, school_claims, etc.), but profiles (pk: user_id) and
-- school_members (pk: school_id, user_id) — both newly audited in the access-
-- control pass (20260926070059) — don't. NEW.id/OLD.id on those tables threw
-- '"old" has no field "id"' and broke every insert/update/delete on them.
-- Fix: pull "id" out of the row as jsonb, which is NULL (not an error) when
-- the key doesn't exist, instead of static record field access.
create or replace function public.audit_trigger() returns trigger
  language plpgsql security definer
  set search_path to 'public'
  as $$
begin
  insert into audit_log(actor, action, entity_table, entity_id, before, after)
  values (
    auth.uid(), tg_op, tg_table_name,
    nullif(to_jsonb(coalesce(new, old))->>'id', '')::uuid,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;
