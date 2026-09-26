-- Access-control hardening pass:
-- 1) Give school_members a real, enforced role tier (admin vs staff) instead
--    of an unvalidated free-text column, so a school's own "operations" staff
--    can be scoped narrower than the school's admin — least privilege within
--    a school, not just between platform staff and schools.
-- 2) Close an audit gap: privilege-bearing tables (profiles.role,
--    school_members) had no audit_trigger, unlike schools/school_claims/etc.
-- 3) Add a Postgres-backed rate limiter (atomic, works across serverless
--    instances, unlike an in-memory limiter) for auth flows (OTP send/verify,
--    magic link) to blunt SMS-pumping / brute-force abuse. No secrets stored.

-- --- 1) school_member_role enum + column migration ---
create type public.school_member_role as enum ('admin', 'staff');

alter table public.school_members
  add column role_new public.school_member_role;

update public.school_members
  set role_new = (case when role = 'staff' then 'staff' else 'admin' end)::public.school_member_role;

alter table public.school_members
  alter column role_new set default 'admin',
  alter column role_new set not null;

alter table public.school_members drop column role;
alter table public.school_members rename column role_new to role;

comment on column public.school_members.role is
  'admin: full control of this school''s portal, including managing other members. staff: day-to-day reporting only (seat status, notices) — cannot manage membership or request profile corrections.';

-- is_school_admin(sid): true for platform staff, or a school_members row for
-- this school with role='admin'. Mirrors is_school_member()'s shape exactly
-- so it composes the same way in policies.
create function public.is_school_admin(sid uuid) returns boolean
  language sql stable security definer
  set search_path to 'public'
  as $$
  select public.is_staff() or exists (
    select 1 from school_members m
    where m.school_id = sid and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Additive membership-management policy: a school admin can manage OTHER
-- members of their own school (promote/demote/remove staff), but never
-- themselves — self-promotion or self-removal must go through platform
-- staff (members_staff policy already covers full control for ops/admin).
-- Inviting brand-new members still requires platform staff (the claim-review
-- flow) — no self-serve invite exists yet, so this only covers managing
-- members who are already on the roster.
create policy members_school_admin_manage_others on public.school_members
  for update using (
    public.is_school_admin(school_id) and user_id <> auth.uid()
  ) with check (
    public.is_school_admin(school_id) and user_id <> auth.uid()
  );

create policy members_school_admin_remove_others on public.school_members
  for delete using (
    public.is_school_admin(school_id) and user_id <> auth.uid()
  );

-- --- 2) Audit coverage for privilege-bearing tables ---
create trigger profiles_audit after insert or delete or update on public.profiles
  for each row execute function public.audit_trigger();

create trigger school_members_audit after insert or delete or update on public.school_members
  for each row execute function public.audit_trigger();

-- --- 3) Rate limiting infra for auth flows ---
create table public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No policies: only reachable via the SECURITY DEFINER function below —
-- default-deny (RLS on, zero policies) is correct here.

create function public.check_rate_limit(p_key text, p_max_attempts integer, p_window_seconds integer)
  returns boolean
  language plpgsql security definer
  set search_path to 'public'
  as $$
declare
  v_count integer;
  v_window_start timestamptz;
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
          when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else rate_limits.count + 1
        end,
        window_start = case
          when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else rate_limits.window_start
        end
  returning count, window_start into v_count, v_window_start;

  return v_count <= p_max_attempts;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;
