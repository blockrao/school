-- New fact tables for the school page (15 Oct 2026): staffing, enrolment,
-- results, compliance, transport, documents. Also lets facilities say
-- "unknown" instead of forcing yes/no.
--
-- Every table carries the provenance columns from 20261015150000, the
-- change-log trigger, and the same access rules:
--   * public: only review_state = 'published' rows of a published school
--   * a member of the school: may add/edit their own rows, but only as
--     draft / pending_review with source_kind = 'school_admin' (they cannot
--     publish their own submissions)
--   * staff: everything
--
-- Compliance rows record what a school reports ("reported"), never a
-- finding that it lacks something. Absence = "Not reported" on the page.
--
-- Claude writes this file and stops; a human applies it.

-- Facilities: unknown must be representable.
alter table public.school_facilities alter column available drop not null;

create table if not exists public.school_staffing (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year text not null,
  teachers_total integer check (teachers_total >= 0),
  teachers_female integer check (teachers_female >= 0),
  non_teaching_total integer check (non_teaching_total >= 0),
  has_special_educator boolean,
  has_counsellor boolean,
  has_nurse boolean,
  unique (school_id, academic_year)
);

create table if not exists public.school_enrolment (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year text not null,
  class_code text not null default 'all',
  students_total integer check (students_total >= 0),
  students_girls integer check (students_girls >= 0),
  sections integer check (sections >= 0),
  avg_class_size numeric(5,1) check (avg_class_size >= 0),
  unique (school_id, academic_year, class_code)
);

create table if not exists public.school_results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_year integer not null check (exam_year between 2000 and 2100),
  exam_class text not null check (exam_class in ('10', '12')),
  board text,
  stream text,
  students_appeared integer check (students_appeared >= 0),
  students_passed integer check (students_passed >= 0),
  unique (school_id, exam_year, exam_class, stream),
  check (students_passed is null or students_appeared is null or students_passed <= students_appeared)
);

create table if not exists public.school_compliance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  item_code text not null check (item_code in (
    'fire_safety', 'building_safety', 'sanitation', 'cctv', 'staff_police_verification',
    'safety_committee', 'grievance_committee', 'water_testing'
  )),
  status text not null check (status in ('reported_yes', 'reported_no', 'not_reported')),
  certificate_no text,
  issued_on date,
  unique (school_id, item_code)
);

create table if not exists public.school_transport (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  provides_bus boolean,
  fleet_owned boolean,
  gps_tracking boolean,
  attendant_on_board boolean,
  coverage_note text,
  unique (school_id)
);

create table if not exists public.school_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'prospectus', 'fee_circular', 'affiliation_letter', 'mandatory_disclosure',
    'admission_notice', 'calendar', 'other'
  )),
  title text not null,
  storage_path text,
  external_url text,
  academic_year text,
  file_bytes bigint check (file_bytes >= 0),
  check (storage_path is not null or external_url is not null)
);

-- Provenance columns, indexes, change log and access rules on all six.
do $$
declare
  t text;
begin
  foreach t in array array[
    'school_staffing', 'school_enrolment', 'school_results',
    'school_compliance', 'school_transport', 'school_documents'
  ] loop
    execute format('alter table public.%I add column if not exists source_kind text not null default %L', t, 'school_admin');
    execute format('alter table public.%I add column if not exists submitted_by uuid', t);
    execute format('alter table public.%I add column if not exists submitted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists evidence_url text', t);
    execute format('alter table public.%I add column if not exists evidence_document_id uuid', t);
    execute format('alter table public.%I add column if not exists observed_at timestamptz', t);
    execute format('alter table public.%I add column if not exists valid_from date', t);
    execute format('alter table public.%I add column if not exists valid_to date', t);
    execute format('alter table public.%I add column if not exists review_state text not null default %L', t, 'draft');
    execute format('alter table public.%I add column if not exists reviewed_by uuid', t);
    execute format('alter table public.%I add column if not exists reviewed_at timestamptz', t);
    execute format('alter table public.%I add column if not exists next_review_on date', t);
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', t);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);

    execute format('alter table public.%I drop constraint if exists %I', t, t || '_source_kind_chk');
    execute format('alter table public.%I add constraint %I check (source_kind in (%L,%L,%L,%L,%L))',
      t, t || '_source_kind_chk', 'school_admin', 'school_document', 'public_record', 'ops_entered', 'compiled');
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_review_state_chk');
    execute format('alter table public.%I add constraint %I check (review_state in (%L,%L,%L,%L,%L,%L))',
      t, t || '_review_state_chk', 'draft', 'pending_review', 'published', 'superseded', 'rejected', 'expired');
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_valid_range_chk');
    execute format('alter table public.%I add constraint %I check (valid_to is null or valid_from is null or valid_to >= valid_from)',
      t, t || '_valid_range_chk');

    execute format('create index if not exists %I on public.%I (school_id, review_state)', t || '_school_state_idx', t);

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select using (
         public.is_staff()
         or public.is_school_member(school_id)
         or (review_state = %L and exists (
              select 1 from public.schools s where s.id = %I.school_id and s.status = %L)))',
      t || '_public_read', t, 'published', t, 'published');

    execute format('drop policy if exists %I on public.%I', t || '_staff_all', t);
    execute format('create policy %I on public.%I for all using (public.is_staff()) with check (public.is_staff())',
      t || '_staff_all', t);

    execute format('drop policy if exists %I on public.%I', t || '_member_insert', t);
    execute format(
      'create policy %I on public.%I for insert with check (
         public.is_school_member(school_id)
         and source_kind = %L and review_state in (%L, %L))',
      t || '_member_insert', t, 'school_admin', 'draft', 'pending_review');

    execute format('drop policy if exists %I on public.%I', t || '_member_update', t);
    execute format(
      'create policy %I on public.%I for update
         using (public.is_school_member(school_id) and review_state in (%L, %L))
         with check (public.is_school_member(school_id) and source_kind = %L and review_state in (%L, %L))',
      t || '_member_update', t, 'draft', 'pending_review', 'school_admin', 'draft', 'pending_review');

    execute format('revoke all on public.%I from anon, authenticated, public', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update on public.%I to authenticated', t);

    execute format('drop trigger if exists %I on public.%I', t || '_fact_revision', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_fact_revision()',
      t || '_fact_revision', t);
  end loop;
end $$;
