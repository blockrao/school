-- Consolidates the affiliation table's RLS from 9 policies down to 4 (one
-- combined policy per action, plus the staff bypass-all) and stops the
-- teacher-side subquery from re-evaluating auth.uid() per row. Behavior is
-- unchanged — permissive policies were already OR'd together by Postgres;
-- this just does that OR once per query instead of letting the planner pay
-- for N separate policy evaluations. Found by Supabase's own performance
-- advisor right after this table shipped. Also adds the two FK-covering
-- indexes the advisor flagged (requested_by/responded_by), low-traffic
-- columns but free to add and consistent with school_id/teacher_id already
-- being indexed.

-- SELECT: was sta_public_active_select + sta_school_select + sta_teacher_select
-- + sta_staff_select (the last wholly redundant with sta_staff_all, which is
-- FOR ALL and already includes select).
drop policy if exists sta_public_active_select on public.school_teacher_affiliations;
drop policy if exists sta_school_select on public.school_teacher_affiliations;
drop policy if exists sta_teacher_select on public.school_teacher_affiliations;
drop policy if exists sta_staff_select on public.school_teacher_affiliations;

create policy sta_select on public.school_teacher_affiliations
  for select using (
    status = 'active'
    or public.is_school_member(school_id)
    or exists (
      select 1 from public.teachers t
      where t.id = teacher_id and t.claimed_by = (select auth.uid())
    )
  );

-- INSERT: was sta_school_insert + sta_teacher_insert.
drop policy if exists sta_school_insert on public.school_teacher_affiliations;
drop policy if exists sta_teacher_insert on public.school_teacher_affiliations;

create policy sta_insert on public.school_teacher_affiliations
  for insert with check (
    (public.is_school_member(school_id) and initiated_by = 'school' and status = 'pending_teacher')
    or (
      exists (
        select 1 from public.teachers t
        where t.id = teacher_id and t.claimed_by = (select auth.uid())
      )
      and initiated_by = 'teacher' and status = 'pending_school'
    )
  );

-- UPDATE: was sta_school_update + sta_teacher_update.
drop policy if exists sta_school_update on public.school_teacher_affiliations;
drop policy if exists sta_teacher_update on public.school_teacher_affiliations;

create policy sta_update on public.school_teacher_affiliations
  for update using (
    public.is_school_member(school_id)
    or exists (
      select 1 from public.teachers t
      where t.id = teacher_id and t.claimed_by = (select auth.uid())
    )
  )
  with check (
    public.is_school_member(school_id)
    or exists (
      select 1 from public.teachers t
      where t.id = teacher_id and t.claimed_by = (select auth.uid())
    )
  );

-- sta_staff_all (FOR ALL, is_staff()) is untouched — still the single staff bypass.

create index if not exists school_teacher_affiliations_requested_by_idx
  on public.school_teacher_affiliations(requested_by);
create index if not exists school_teacher_affiliations_responded_by_idx
  on public.school_teacher_affiliations(responded_by);
