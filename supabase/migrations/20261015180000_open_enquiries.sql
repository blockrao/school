-- Open enquiries (15 Oct 2026): a parent can ask a school a question without
-- signing in. Owner decision (15 Oct): the parent enters name and phone or
-- email and ticks consent to share them with THIS school; the school gets the
-- question and contact in one email and replies directly. This is separate
-- from `enquiries` (signed-in, controlled-intermediary model) on purpose.
--
-- Access: anyone may INSERT a well-formed row (consent must be true); nobody
-- can read through the API except SchoolOye staff and members of that school.
-- Spam control (honeypot, rate limit) is done in the server action.
--
-- Claude writes this file and stops; a human applies it.
create table if not exists public.open_enquiries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  parent_name text not null check (char_length(btrim(parent_name)) between 1 and 120),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9]{10,15}$'),
  class_code text,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  consent_shared boolean not null check (consent_shared),
  status text not null default 'new' check (status in ('new', 'emailed', 'email_failed', 'no_school_email', 'spam')),
  created_at timestamptz not null default now(),
  check (contact_email is not null or contact_phone is not null)
);

create index if not exists open_enquiries_school_idx on public.open_enquiries (school_id, created_at desc);

alter table public.open_enquiries enable row level security;

drop policy if exists open_enquiries_insert on public.open_enquiries;
create policy open_enquiries_insert on public.open_enquiries
  for insert to anon, authenticated
  with check (
    consent_shared
    and exists (select 1 from public.schools s where s.id = school_id and s.status = 'published')
  );

drop policy if exists open_enquiries_read on public.open_enquiries;
create policy open_enquiries_read on public.open_enquiries
  for select using (public.is_staff() or public.is_school_member(school_id));

drop policy if exists open_enquiries_staff_update on public.open_enquiries;
create policy open_enquiries_staff_update on public.open_enquiries
  for update using (public.is_staff()) with check (public.is_staff());

revoke all on public.open_enquiries from anon, authenticated, public;
grant insert on public.open_enquiries to anon, authenticated;
grant select, update on public.open_enquiries to authenticated;
