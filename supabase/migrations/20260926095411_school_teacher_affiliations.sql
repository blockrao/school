-- Verified school ⇄ teacher team membership. A school can invite an
-- existing (claimed) teacher profile onto its published team, or a teacher
-- can request to join a school's team; the other side must accept before it
-- goes live. This is the mechanism behind the school's public "Our Teachers"
-- page (schools are mandated to publish a teacher list — this doubles as
-- that) and a "Verified at" signal on the teacher's own canonical profile.
-- The teacher's page itself stays teacher-owned/managed either way — a
-- school can only reference it via this join, never create or edit it.

create type public.affiliation_status as enum (
  'pending_teacher',      -- school invited, awaiting the teacher
  'pending_school',       -- teacher requested, awaiting the school
  'active',
  'declined_by_teacher',
  'declined_by_school',
  'removed'
);

create table public.school_teacher_affiliations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  status public.affiliation_status not null,
  initiated_by text not null check (initiated_by in ('school', 'teacher')),
  requested_by uuid references auth.users(id),
  responded_by uuid references auth.users(id),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, teacher_id)
);

create index school_teacher_affiliations_school_idx on public.school_teacher_affiliations(school_id);
create index school_teacher_affiliations_teacher_idx on public.school_teacher_affiliations(teacher_id);
create index school_teacher_affiliations_active_idx on public.school_teacher_affiliations(school_id)
  where status = 'active';

alter table public.school_teacher_affiliations enable row level security;

-- Reads: the school side, the teacher side, anyone (active rows only — the
-- public team page and the teacher's "Verified at" line need no session),
-- and staff.
create policy sta_school_select on public.school_teacher_affiliations
  for select using (public.is_school_member(school_id));

create policy sta_teacher_select on public.school_teacher_affiliations
  for select using (
    exists (select 1 from public.teachers t where t.id = teacher_id and t.claimed_by = auth.uid())
  );

create policy sta_public_active_select on public.school_teacher_affiliations
  for select using (status = 'active');

create policy sta_staff_select on public.school_teacher_affiliations
  for select using (public.is_staff());

-- Writes: a school member starts an invite (status must start pending_teacher);
-- a teacher owner starts a request (status must start pending_school). Which
-- transitions are legal from there (accept/decline/remove/re-invite) is
-- enforced in the server action, not here — RLS's job is restricting *who*
-- can touch a row to the two parties (+staff), not the state machine itself.
create policy sta_school_insert on public.school_teacher_affiliations
  for insert with check (
    public.is_school_member(school_id) and initiated_by = 'school' and status = 'pending_teacher'
  );

create policy sta_teacher_insert on public.school_teacher_affiliations
  for insert with check (
    exists (select 1 from public.teachers t where t.id = teacher_id and t.claimed_by = auth.uid())
    and initiated_by = 'teacher'
    and status = 'pending_school'
  );

create policy sta_school_update on public.school_teacher_affiliations
  for update using (public.is_school_member(school_id)) with check (public.is_school_member(school_id));

create policy sta_teacher_update on public.school_teacher_affiliations
  for update using (
    exists (select 1 from public.teachers t where t.id = teacher_id and t.claimed_by = auth.uid())
  )
  with check (
    exists (select 1 from public.teachers t where t.id = teacher_id and t.claimed_by = auth.uid())
  );

create policy sta_staff_all on public.school_teacher_affiliations
  for all using (public.is_staff()) with check (public.is_staff());

create function public.touch_updated_at() returns trigger
  language plpgsql
  set search_path to 'public'
  as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger school_teacher_affiliations_touch_updated_at
  before update on public.school_teacher_affiliations
  for each row execute function public.touch_updated_at();

create trigger school_teacher_affiliations_audit
  after insert or update or delete on public.school_teacher_affiliations
  for each row execute function public.audit_trigger();
