-- Provenance layer for every published school fact (15 Oct 2026).
--
-- Why: SchoolOye publishes what school admins provide. Every fact shown on a
-- school page must say who supplied it, from what evidence, as of when, who
-- reviewed it, and how long it is valid. Today only `verification` (an enum)
-- exists on some tables, and `field_provenance` has no observed/valid dates.
--
-- What this does (additive only; no existing column changes meaning):
--   1. Adds the same provenance columns to the fact tables that feed the page:
--      fee_items, admission_cycles, seat_status, school_facilities,
--      school_media, field_provenance.
--   2. Adds an append-only `fact_revisions` log filled by a trigger, so any
--      change (including by a school admin) can be traced and a bad edit can
--      be reversed. Staff-read only.
--
-- Vocabularies (text + CHECK, so they can grow without enum migrations):
--   source_kind : school_admin | school_document | public_record | ops_entered | compiled
--   review_state: draft | pending_review | published | superseded | rejected | expired
--
-- Existing rows keep working: source_kind defaults to 'compiled' and
-- review_state to 'published', which matches how they are shown today.
-- Existing RLS read policies are NOT changed here; the school page will read
-- through public views (a later migration) that also require
-- review_state = 'published'.
--
-- Claude writes this file and stops; a human runs
-- `pnpm db:migrate 20261015150000_fact_provenance_layer.sql --confirm`.

do $$
declare
  t text;
begin
  foreach t in array array[
    'fee_items', 'admission_cycles', 'seat_status',
    'school_facilities', 'school_media', 'field_provenance'
  ] loop
    execute format('alter table public.%I add column if not exists source_kind text not null default %L', t, 'compiled');
    execute format('alter table public.%I add column if not exists submitted_by uuid', t);
    execute format('alter table public.%I add column if not exists submitted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists evidence_url text', t);
    execute format('alter table public.%I add column if not exists evidence_document_id uuid', t);
    execute format('alter table public.%I add column if not exists observed_at timestamptz', t);
    execute format('alter table public.%I add column if not exists valid_from date', t);
    execute format('alter table public.%I add column if not exists valid_to date', t);
    execute format('alter table public.%I add column if not exists review_state text not null default %L', t, 'published');
    execute format('alter table public.%I add column if not exists reviewed_by uuid', t);
    execute format('alter table public.%I add column if not exists reviewed_at timestamptz', t);
    execute format('alter table public.%I add column if not exists next_review_on date', t);

    execute format('alter table public.%I drop constraint if exists %I', t, t || '_source_kind_chk');
    execute format(
      'alter table public.%I add constraint %I check (source_kind in (%L,%L,%L,%L,%L))',
      t, t || '_source_kind_chk',
      'school_admin', 'school_document', 'public_record', 'ops_entered', 'compiled');

    execute format('alter table public.%I drop constraint if exists %I', t, t || '_review_state_chk');
    execute format(
      'alter table public.%I add constraint %I check (review_state in (%L,%L,%L,%L,%L,%L))',
      t, t || '_review_state_chk',
      'draft', 'pending_review', 'published', 'superseded', 'rejected', 'expired');

    execute format('alter table public.%I drop constraint if exists %I', t, t || '_valid_range_chk');
    execute format(
      'alter table public.%I add constraint %I check (valid_to is null or valid_from is null or valid_to >= valid_from)',
      t, t || '_valid_range_chk');
  end loop;
end $$;

-- field_provenance additionally needs to say which slice of an entity a value
-- covers (e.g. a class or an academic year) and how it was obtained.
alter table public.field_provenance add column if not exists scope_key text;
alter table public.field_provenance add column if not exists method text;

comment on column public.fee_items.source_kind is
  'Who supplied this fact: school_admin, school_document, public_record, ops_entered, compiled.';
comment on column public.fee_items.review_state is
  'draft | pending_review | published | superseded | rejected | expired. Only published rows reach the public page.';

-- ---------------------------------------------------------------------------
-- Append-only revision log.
-- ---------------------------------------------------------------------------
create table if not exists public.fact_revisions (
  id bigint generated always as identity primary key,
  school_id uuid,
  table_name text not null,
  row_key text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb,
  actor_id uuid,
  actor_role text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists fact_revisions_school_idx on public.fact_revisions (school_id, created_at desc);
create index if not exists fact_revisions_row_idx on public.fact_revisions (table_name, row_key, created_at desc);

alter table public.fact_revisions enable row level security;

drop policy if exists fact_revisions_staff_read on public.fact_revisions;
create policy fact_revisions_staff_read on public.fact_revisions
  for select using (public.is_staff());

-- Nobody edits history through the API; the trigger (security definer) writes.
revoke all on public.fact_revisions from anon, authenticated, public;
grant select on public.fact_revisions to authenticated;

create or replace function public.log_fact_revision() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  o jsonb;
  k text;
begin
  if tg_op = 'DELETE' then
    v := to_jsonb(old);
    o := v;
  else
    v := to_jsonb(new);
    o := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  end if;

  if tg_op = 'UPDATE' and o = v then
    return new;
  end if;

  k := coalesce(v ->> 'id', (v ->> 'school_id') || ':' || coalesce(v ->> 'facility_code', ''));

  insert into public.fact_revisions
    (school_id, table_name, row_key, action, old_values, new_values, actor_id, actor_role)
  values (
    nullif(v ->> 'school_id', '')::uuid,
    tg_table_name,
    k,
    lower(tg_op),
    case when tg_op = 'INSERT' then null else o end,
    case when tg_op = 'DELETE' then null else v end,
    auth.uid(),
    current_user
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.log_fact_revision() from anon, authenticated, public;

do $$
declare
  t text;
begin
  foreach t in array array[
    'fee_items', 'admission_cycles', 'seat_status', 'school_facilities', 'school_media'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_fact_revision', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_fact_revision()',
      t || '_fact_revision', t);
  end loop;
end $$;
