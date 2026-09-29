-- Events + News depth (Prav, 29 Sep 2026, SEO/GEO follow-up thread).
--
-- Product shape (Prav's own words, refined):
--   1. A school admin creates an event/post -> it shows on THEIR OWN school
--      page right away. No ops gate for that: it's the school managing its
--      own profile, same trust tier as any other self-reported fact already
--      on the page (min_class, address, ...). This is a deliberate change for
--      news vs. the school_posts migration's original comment ("only
--      'approved' rows are meant to go public") -- that gate now applies to
--      the SITE-WIDE /news and /events listings only, not the school's own
--      page. Only 1 production school_posts row exists, so this is safe to
--      redefine rather than bolt a second system on top.
--   2. Separately, the school can "request listing" -> that's a distinct,
--      ops-reviewed step that gates inclusion in the public /events and
--      /news aggregator pages (listing_requested_at / listing_review).
--   3. Every event/post gets a permanent canonical URL that survives edits,
--      exactly like the teacher_code mechanism (D-125,
--      20260928150000_teacher_code_and_url.sql): a random, unique, never-
--      reused numeric code is minted once and baked into the slug. Editing
--      the title changes the display part of the slug; the code (and so the
--      identity a lookup resolves by) never changes. "Stays there forever,
--      just the status changes" is implemented this way, not as a mutable
--      status column for the page's IDENTITY -- the page's temporal status
--      (Upcoming/Ongoing/Completed) is derived from dates at render time
--      (pure function, mirrors deadlineState()), never stored, so it can't
--      go stale.
--   4. Featured post / press release: Prav wants these "sold separately" as
--      a productized service. There is no billing/commerce system in this
--      schema to hook into, and inventing one here would be exactly the kind
--      of unrequested abstraction the SEO/GEO brief's principle (D) warns
--      against. So: `tier` (what's actually live) can only ever be set by
--      staff (RLS-enforced) -- a school cannot self-grant featured/press
--      status. `requested_tier` is a free field a school can set to express
--      interest; ops turns that into a real `tier` once the commercial side
--      is sorted out, outside this schema.

-- 1. post_tier -------------------------------------------------------------
create type public.post_tier as enum ('organic', 'featured', 'press_release');

-- 2. school_posts: permanent code/slug + tier + listing review ------------
alter table public.school_posts
  add column if not exists post_code integer,
  add column if not exists slug text,
  add column if not exists tier public.post_tier not null default 'organic',
  add column if not exists requested_tier public.post_tier,
  add column if not exists listing_requested_at timestamptz,
  add column if not exists listing_review public.review_status,
  add column if not exists listing_reviewed_by uuid references auth.users(id),
  add column if not exists listing_reviewed_at timestamptz;

create or replace function public.mint_post_code()
returns integer language plpgsql volatile as $$
declare
  used int;
  lo int := 10000;
  hi int := 99999;
  code int;
begin
  select count(*) into used from public.school_posts where post_code between 10000 and 99999;
  if used >= 72000 then lo := 100000; hi := 999999; end if;
  loop
    code := lo + floor(random() * (hi - lo + 1))::int;
    exit when not exists (select 1 from public.school_posts where post_code = code);
  end loop;
  return code;
end
$$;

create or replace function public.post_slug(p_title text, p_code integer)
returns text language sql immutable as $$
  select coalesce(nullif(public.slugify_60(coalesce(p_title, ''), 59 - length(p_code::text)), ''), 'post')
    || '-' || p_code
$$;

create or replace function public.school_posts_code_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.post_code := public.mint_post_code();
  elsif new.post_code is distinct from old.post_code then
    raise exception 'school_posts.post_code is permanent: % -> % refused', old.post_code, new.post_code;
  end if;
  new.slug := public.post_slug(new.title, new.post_code);
  return new;
end
$$;

update public.school_posts set post_code = public.mint_post_code() where post_code is null;
update public.school_posts set slug = public.post_slug(title, post_code) where slug is null;
alter table public.school_posts
  alter column post_code set not null,
  alter column slug set not null;
create unique index if not exists school_posts_post_code_unique on public.school_posts (post_code);
create unique index if not exists school_posts_slug_unique on public.school_posts (slug);

drop trigger if exists school_posts_code_guard on public.school_posts;
create trigger school_posts_code_guard before insert or update of title, post_code, slug on public.school_posts
  for each row execute function public.school_posts_code_guard();

-- A school can only ever insert/hold 'organic' tier for itself -- featured
-- and press_release are staff-granted only (school_posts_staff_all below
-- already covers staff writes to any tier).
drop policy if exists school_posts_member_insert on public.school_posts;
create policy school_posts_member_insert on public.school_posts
  for insert with check (
    public.is_school_member(school_id) and created_by = auth.uid() and tier = 'organic'
  );

-- Re-scope the "school can edit" window: previously locked at first review
-- (review = 'pending'); now organic posts go live immediately (app sets
-- review = 'approved' at insert, see portal action), so lock edits instead
-- at "has a listing request been made" -- freely editable on your own page,
-- locked once submitted for the public aggregator so ops reviews something
-- stable.
drop policy if exists school_posts_member_update_pending on public.school_posts;
create policy school_posts_member_update_unlisted on public.school_posts
  for update using (public.is_school_member(school_id) and listing_requested_at is null)
  with check (public.is_school_member(school_id) and tier = 'organic');

-- 3. school_events -----------------------------------------------------------
create type public.school_event_type as enum (
  'ptm', 'open_house', 'admission_test', 'sports_day', 'cultural',
  'workshop', 'result_day', 'holiday', 'fee_deadline', 'other'
);

create table public.school_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  event_code integer,
  slug text,
  event_type public.school_event_type not null default 'other',
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 5000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  class_codes text[] not null default '{}',
  registration_url text,
  source_url text,
  cancelled_at timestamptz,
  listing_requested_at timestamptz,
  listing_review public.review_status,
  listing_reviewed_by uuid references auth.users(id),
  listing_reviewed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_events_ends_after_starts check (ends_at is null or ends_at >= starts_at)
);

create index school_events_school_id_idx on public.school_events(school_id);
create index school_events_listing_review_idx on public.school_events(listing_review) where listing_review = 'pending';
create index school_events_starts_at_idx on public.school_events(starts_at);

alter table public.school_events enable row level security;

create policy school_events_member_select on public.school_events
  for select using (public.is_school_member(school_id));

create policy school_events_member_insert on public.school_events
  for insert with check (public.is_school_member(school_id) and created_by = auth.uid());

-- Same shape as school_posts: freely editable until a listing is requested.
create policy school_events_member_update_unlisted on public.school_events
  for update using (public.is_school_member(school_id) and listing_requested_at is null)
  with check (public.is_school_member(school_id));

create policy school_events_staff_all on public.school_events
  for all using (public.is_staff()) with check (public.is_staff());

create trigger school_events_audit
  after insert or update or delete on public.school_events
  for each row execute function public.audit_trigger();

create function public.school_events_set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger school_events_set_updated_at
  before update on public.school_events
  for each row execute function public.school_events_set_updated_at();

create or replace function public.mint_event_code()
returns integer language plpgsql volatile as $$
declare
  used int;
  lo int := 10000;
  hi int := 99999;
  code int;
begin
  select count(*) into used from public.school_events where event_code between 10000 and 99999;
  if used >= 72000 then lo := 100000; hi := 999999; end if;
  loop
    code := lo + floor(random() * (hi - lo + 1))::int;
    exit when not exists (select 1 from public.school_events where event_code = code);
  end loop;
  return code;
end
$$;

create or replace function public.event_slug(p_title text, p_code integer)
returns text language sql immutable as $$
  select coalesce(nullif(public.slugify_60(coalesce(p_title, ''), 59 - length(p_code::text)), ''), 'event')
    || '-' || p_code
$$;

create or replace function public.school_events_code_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.event_code := public.mint_event_code();
  elsif new.event_code is distinct from old.event_code then
    raise exception 'school_events.event_code is permanent: % -> % refused', old.event_code, new.event_code;
  end if;
  new.slug := public.event_slug(new.title, new.event_code);
  return new;
end
$$;

drop trigger if exists school_events_code_guard on public.school_events;
create trigger school_events_code_guard before insert or update of title, event_code, slug on public.school_events
  for each row execute function public.school_events_code_guard();

create unique index if not exists school_events_event_code_unique on public.school_events (event_code);
create unique index if not exists school_events_slug_unique on public.school_events (slug);
-- Fresh, empty table (no backfill needed) -- the before-insert trigger above
-- always sets both before this constraint is checked.
alter table public.school_events
  alter column event_code set not null,
  alter column slug set not null;
