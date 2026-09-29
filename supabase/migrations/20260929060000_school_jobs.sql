-- School jobs (Prav, 29 Sep 2026, "a lot of overlaps on what you just built").
--
-- Same product shape as school_events / school_posts
-- (20260929050000_events_and_news_depth.sql), reused deliberately rather than
-- inventing a third pattern:
--   1. A school admin posts a job -> it shows on THEIR OWN school page right
--      away (no ops gate -- same trust tier as any other self-reported fact).
--   2. Separately, "request listing" -> ops-reviewed, gates inclusion in the
--      public /jobs aggregator (listing_requested_at / listing_review).
--   3. Permanent canonical URL: a random, unique, never-reused numeric code
--      minted once and baked into the slug (D-125 mechanism), guarded so it
--      can never change. Editing the title only changes the display part.
--   4. A job's Open/Closed/Filled status is DERIVED at render time from
--      closes_at/filled_at/cancelled_at (mirrors deadlineState() and
--      eventTemporalStatus()) -- never stored, so it can't go stale.

create type public.job_employment_type as enum (
  'full_time', 'part_time', 'contract', 'visiting'
);

create table public.school_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  job_code integer,
  slug text,
  title text not null check (char_length(title) between 1 and 200),
  employment_type public.job_employment_type not null default 'full_time',
  subject text,
  description text not null check (char_length(description) <= 5000),
  experience_required text,
  salary_range text,
  location text,
  apply_url text,
  apply_email text,
  class_codes text[] not null default '{}',
  closes_at timestamptz,
  filled_at timestamptz,
  cancelled_at timestamptz,
  listing_requested_at timestamptz,
  listing_review public.review_status,
  listing_reviewed_by uuid references auth.users(id),
  listing_reviewed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_jobs_apply_contact check (apply_url is not null or apply_email is not null)
);

create index school_jobs_school_id_idx on public.school_jobs(school_id);
create index school_jobs_listing_review_idx on public.school_jobs(listing_review) where listing_review = 'pending';

alter table public.school_jobs enable row level security;

create policy school_jobs_member_select on public.school_jobs
  for select using (public.is_school_member(school_id));

create policy school_jobs_member_insert on public.school_jobs
  for insert with check (public.is_school_member(school_id) and created_by = auth.uid());

-- Same shape as school_events/school_posts: freely editable until a listing
-- is requested, so ops reviews something stable.
create policy school_jobs_member_update_unlisted on public.school_jobs
  for update using (public.is_school_member(school_id) and listing_requested_at is null)
  with check (public.is_school_member(school_id));

create policy school_jobs_staff_all on public.school_jobs
  for all using (public.is_staff()) with check (public.is_staff());

create trigger school_jobs_audit
  after insert or update or delete on public.school_jobs
  for each row execute function public.audit_trigger();

create function public.school_jobs_set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger school_jobs_set_updated_at
  before update on public.school_jobs
  for each row execute function public.school_jobs_set_updated_at();

create or replace function public.mint_job_code()
returns integer language plpgsql volatile as $$
declare
  used int;
  lo int := 10000;
  hi int := 99999;
  code int;
begin
  select count(*) into used from public.school_jobs where job_code between 10000 and 99999;
  if used >= 72000 then lo := 100000; hi := 999999; end if;
  loop
    code := lo + floor(random() * (hi - lo + 1))::int;
    exit when not exists (select 1 from public.school_jobs where job_code = code);
  end loop;
  return code;
end
$$;

create or replace function public.job_slug(p_title text, p_code integer)
returns text language sql immutable as $$
  select coalesce(nullif(public.slugify_60(coalesce(p_title, ''), 59 - length(p_code::text)), ''), 'job')
    || '-' || p_code
$$;

create or replace function public.school_jobs_code_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.job_code := public.mint_job_code();
  elsif new.job_code is distinct from old.job_code then
    raise exception 'school_jobs.job_code is permanent: % -> % refused', old.job_code, new.job_code;
  end if;
  new.slug := public.job_slug(new.title, new.job_code);
  return new;
end
$$;

drop trigger if exists school_jobs_code_guard on public.school_jobs;
create trigger school_jobs_code_guard before insert or update of title, job_code, slug on public.school_jobs
  for each row execute function public.school_jobs_code_guard();

create unique index if not exists school_jobs_job_code_unique on public.school_jobs (job_code);
create unique index if not exists school_jobs_slug_unique on public.school_jobs (slug);
-- Fresh, empty table (no backfill needed) -- the before-insert trigger above
-- always sets both before this constraint is checked.
alter table public.school_jobs
  alter column job_code set not null,
  alter column slug set not null;
