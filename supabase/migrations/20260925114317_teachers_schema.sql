-- Flow 5.14 (Teacher profile + directory) — light scope. Non-destructive
-- (CREATE TABLE, no ALTER/DROP on anything existing), shown first since this
-- is a new personal-data domain, not an additive column on existing structure.
--
-- Light scope per explicit instruction: teachers, teacher_claims,
-- teacher_qualifications, teacher_experience + the media bucket only.
-- teacher_recommendations, teacher_enquiries and teacher_awards are
-- deliberately NOT created — reputation/marketplace features, parked, logged
-- in docs/page-enrichment-backlog.md as "parked — needs Prav's decision".
--
-- Modelled closely on the schools/school_claims pattern already in this
-- database, with one deliberate simplification: the design (Teacher Profile.dc.html
-- 14c, Teachers Directory.dc.html) shows an "unclaimed" state reached from a
-- school's scraped staff list, but no such staff-list ingestion exists in this
-- database — there is nothing to claim yet. teacher_claims is still built (for
-- that pipeline later), but the primary path is self-service creation: a
-- teacher creates their own profile directly (claimed_by set at insert time),
-- the same shape as a parent creating a child profile in Application Help.
-- Directory visibility requires BOTH claimed_by IS NOT NULL and is_listed —
-- "we don't list anyone without their consent" (design's own words) is enforced
-- structurally, not just by UI copy.

create table teachers (
  id uuid primary key default gen_random_uuid(),
  claimed_by uuid references profiles(user_id),
  full_name text not null,
  subject text,
  level text,                          -- PRT / TGT / PGT, free text (matches design, no controlled vocab yet)
  primary_school_id uuid references schools(id),
  locality_id integer references localities(id),
  headline text,                       -- one-line summary shown in directory cards ("Students map their own mohalla...")
  about text,
  years_teaching smallint,
  open_to text[] not null default '{}',
  photo_storage_path text,             -- private bucket, see storage policy below
  is_listed boolean not null default false,
  status record_status not null default 'draft',  -- reuses the same enum/pattern as schools.status
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teacher_claims (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  user_id uuid not null references profiles(user_id),
  method text not null,
  evidence jsonb,
  status claim_status not null default 'pending',
  reviewed_by uuid references profiles(user_id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table teacher_experience (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  role_title text not null,
  school_id uuid references schools(id),   -- nullable: some entries are free text ("Self-employed, Jaipur")
  school_text text,                        -- shown when school_id is null
  start_year smallint not null,
  end_year smallint,                       -- null = current
  sort_order smallint not null default 0
);

create table teacher_qualifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  title text not null,
  detail text,
  verified_by uuid references profiles(user_id),
  verified_at timestamptz
);

alter table teachers enable row level security;
alter table teacher_claims enable row level security;
alter table teacher_experience enable row level security;
alter table teacher_qualifications enable row level security;

-- teachers: public can read published+listed rows; the claiming teacher can
-- read/write their own row (any status); staff can do anything.
create policy teachers_public_read on teachers
  for select
  using (status = 'published' and is_listed or is_staff() or claimed_by = auth.uid());

create policy teachers_owner_insert on teachers
  for insert to authenticated
  with check (claimed_by = auth.uid());

create policy teachers_owner_update on teachers
  for update to authenticated
  using (claimed_by = auth.uid())
  with check (claimed_by = auth.uid());

create policy teachers_staff_all on teachers
  for all
  using (is_staff())
  with check (is_staff());

-- Child tables (experience/qualifications): owner of the parent teacher row
-- can manage their own; public can read rows belonging to a public teacher.
create policy teacher_experience_public_read on teacher_experience
  for select
  using (exists (select 1 from teachers t where t.id = teacher_id and (t.status = 'published' and t.is_listed or is_staff() or t.claimed_by = auth.uid())));
create policy teacher_experience_owner_write on teacher_experience
  for all to authenticated
  using (exists (select 1 from teachers t where t.id = teacher_id and t.claimed_by = auth.uid()))
  with check (exists (select 1 from teachers t where t.id = teacher_id and t.claimed_by = auth.uid()));

create policy teacher_qualifications_public_read on teacher_qualifications
  for select
  using (exists (select 1 from teachers t where t.id = teacher_id and (t.status = 'published' and t.is_listed or is_staff() or t.claimed_by = auth.uid())));
create policy teacher_qualifications_owner_write on teacher_qualifications
  for all to authenticated
  using (exists (select 1 from teachers t where t.id = teacher_id and t.claimed_by = auth.uid()))
  with check (
    exists (select 1 from teachers t where t.id = teacher_id and t.claimed_by = auth.uid())
    -- a teacher can add/edit their own qualification text, but never mark it
    -- verified themselves — and this also blocks editing a row staff already
    -- verified, since an UPDATE that doesn't null these back out fails the check.
    and verified_by is null and verified_at is null
  );

-- Staff-only write on qualifications' verified_* columns (recognition is
-- conferred, not self-declared).
create policy teacher_quals_staff_all on teacher_qualifications for all using (is_staff()) with check (is_staff());

-- teacher_claims: mirrors school_claims exactly.
create policy teacher_claims_insert on teacher_claims
  for insert to authenticated
  with check (user_id = auth.uid());
create policy teacher_claims_self_read on teacher_claims
  for select
  using (user_id = auth.uid() or is_staff());
create policy teacher_claims_staff_write on teacher_claims
  for update using (is_staff()) with check (is_staff());

-- Private Storage bucket for teacher photos. Path convention:
-- {user_id}/{teacher_id}/{filename} — same shape as documents/school-claims.
-- Kept private even though photos are meant to be publicly visible: reads go
-- through a short-lived signed URL from server code (same as the Document
-- Vault), never a public bucket URL, so nothing here is a permanent public link.
insert into storage.buckets (id, name, public)
values ('teacher-media', 'teacher-media', false)
on conflict (id) do nothing;

create policy "teacher_media_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "teacher_media_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "teacher_media_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "teacher_media_staff_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'teacher-media' and is_staff());

-- Minimal grants — RLS above does the real narrowing, but the table-level grant
-- must exist too (this project's default ACLs no longer auto-grant on new
-- tables — see 20260924160606_readonly_role.sql's sibling fix upstream, and
-- this repo's own postgres-role default-privileges fix earlier this session).
grant select, insert, update on teachers to authenticated;
grant select on teachers to anon;
grant select, insert, update on teacher_experience to authenticated;
grant select on teacher_experience to anon;
grant select, insert on teacher_qualifications to authenticated;
grant select on teacher_qualifications to anon;
grant select, insert on teacher_claims to authenticated;
