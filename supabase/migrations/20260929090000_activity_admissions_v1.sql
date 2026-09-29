-- Activity & Admissions Consolidation Increment (Prav, 29 Sep 2026).
--
-- Fixes the P0 RLS bug found in the verification pass: requesting a site-wide
-- listing for a News/Events/Jobs item permanently locked the row, including
-- legitimate lifecycle actions (cancel an event, mark/cancel a job, withdraw
-- news) that have nothing to do with editing content. The old policies gated
-- ALL updates on `listing_requested_at is null`, which is a row-level gate,
-- not a column-level one.
--
-- New model, same three tables, no new abstraction:
--   1. RLS now lets a school member attempt an update on their own row at
--      any time (`school_*_member_update`, replacing `..._member_update_unlisted`).
--   2. A BEFORE UPDATE trigger per table (`school_*_enforce_edit_lock`) does
--      the actual content-vs-lifecycle distinction:
--        - A change that only touches that table's lifecycle column(s)
--          (cancelled_at / filled_at / withdrawn_at) — or only touches the
--          listing_requested_at/listing_review pair (a fresh request or a
--          resubmission) — is always allowed, in any review state.
--        - A content change while `listing_review = 'pending'` is blocked
--          outright: ops is actively reviewing a specific version of this
--          row, so it can't shift underneath them.
--        - A content change to a row that is currently `listing_review =
--          'approved'` (live on the public aggregator) is allowed, but
--          demotes `listing_review` to 'edited' and clears the reviewer —
--          the edit takes effect on the school's own page immediately (that
--          feed has no listing gate) but the site-wide aggregator keeps
--          showing the last-approved version's absence rather than an
--          unreviewed edit, until ops re-approves. This is the "appropriate
--          review rule" for material changes after approval.
--        - Any other content change (never requested, or currently
--          rejected) goes through freely — this is the "freely editable"
--          window, now correctly reachable after a rejection too.
--   3. `is_staff()` bypasses the trigger entirely — ops can still correct
--      anything directly, same as before.
--
-- Also adds:
--   - `rejection_reason` on all three tables, set by the (now reason-
--     carrying) ops reject actions, cleared on approve or resubmit —
--     P0.2/P1.5, "Request → Rejected with reason → Edit → Resubmit".
--   - `withdrawn_at` on school_posts — News had no lifecycle column at all
--     (cancel/mark-filled already existed for events/jobs); this is the
--     news equivalent of "cancel", pulled from both the school's own public
--     page and the site-wide aggregator (unlike cancelled events / filled
--     jobs, which stay visible with a status label — a withdrawn news post
--     is a retraction, not a status change worth advertising).
--   - `city_slug`/`city_name` appended to api.public_school_admissions, for
--     the new site-wide /admissions discovery page (reuses this view
--     unfiltered rather than a new admissions data model).
--   - A minimal `analytics_events` table — there is no analytics
--     infrastructure anywhere in this codebase yet (confirmed in the
--     verification pass), so this is the smallest thing that can answer
--     "is this being used": one append-only table, no new platform.

-- 1. rejection_reason + withdrawn_at ----------------------------------------

alter table public.school_posts add column if not exists rejection_reason text;
alter table public.school_events add column if not exists rejection_reason text;
alter table public.school_jobs add column if not exists rejection_reason text;
alter table public.school_posts add column if not exists withdrawn_at timestamptz;

-- 2. RLS: replace the row-level "unlisted" gate with an always-attemptable
--    update, policed instead by the edit-lock triggers below. ----------------

drop policy if exists school_posts_member_update_unlisted on public.school_posts;
create policy school_posts_member_update on public.school_posts
  for update using (public.is_school_member(school_id))
  with check (public.is_school_member(school_id) and tier = 'organic');

drop policy if exists school_events_member_update_unlisted on public.school_events;
create policy school_events_member_update on public.school_events
  for update using (public.is_school_member(school_id))
  with check (public.is_school_member(school_id));

drop policy if exists school_jobs_member_update_unlisted on public.school_jobs;
create policy school_jobs_member_update on public.school_jobs
  for update using (public.is_school_member(school_id))
  with check (public.is_school_member(school_id));

-- 3. Edit-lock triggers -------------------------------------------------------

create or replace function public.school_posts_enforce_edit_lock()
returns trigger language plpgsql
set search_path to 'public'
as $$
declare
  strip text[] := array['withdrawn_at', 'updated_at', 'listing_requested_at',
    'listing_review', 'listing_reviewed_by', 'listing_reviewed_at', 'rejection_reason'];
  content_unchanged boolean;
begin
  if public.is_staff() then
    return new;
  end if;

  content_unchanged := (to_jsonb(old) - strip) = (to_jsonb(new) - strip);
  if content_unchanged then
    return new;
  end if;

  if old.listing_review = 'pending' then
    raise exception 'Cannot edit this post while its /news listing request is under review.';
  end if;

  if old.listing_review = 'approved' and new.listing_review = 'approved' then
    new.listing_review := 'edited';
    new.listing_reviewed_by := null;
    new.listing_reviewed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists school_posts_enforce_edit_lock on public.school_posts;
create trigger school_posts_enforce_edit_lock
  before update on public.school_posts
  for each row execute function public.school_posts_enforce_edit_lock();

create or replace function public.school_events_enforce_edit_lock()
returns trigger language plpgsql
set search_path to 'public'
as $$
declare
  strip text[] := array['cancelled_at', 'updated_at', 'listing_requested_at',
    'listing_review', 'listing_reviewed_by', 'listing_reviewed_at', 'rejection_reason'];
  content_unchanged boolean;
begin
  if public.is_staff() then
    return new;
  end if;

  content_unchanged := (to_jsonb(old) - strip) = (to_jsonb(new) - strip);
  if content_unchanged then
    return new;
  end if;

  if old.listing_review = 'pending' then
    raise exception 'Cannot edit this event while its /events listing request is under review.';
  end if;

  if old.listing_review = 'approved' and new.listing_review = 'approved' then
    new.listing_review := 'edited';
    new.listing_reviewed_by := null;
    new.listing_reviewed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists school_events_enforce_edit_lock on public.school_events;
create trigger school_events_enforce_edit_lock
  before update on public.school_events
  for each row execute function public.school_events_enforce_edit_lock();

create or replace function public.school_jobs_enforce_edit_lock()
returns trigger language plpgsql
set search_path to 'public'
as $$
declare
  strip text[] := array['filled_at', 'cancelled_at', 'updated_at', 'listing_requested_at',
    'listing_review', 'listing_reviewed_by', 'listing_reviewed_at', 'rejection_reason'];
  content_unchanged boolean;
begin
  if public.is_staff() then
    return new;
  end if;

  content_unchanged := (to_jsonb(old) - strip) = (to_jsonb(new) - strip);
  if content_unchanged then
    return new;
  end if;

  if old.listing_review = 'pending' then
    raise exception 'Cannot edit this job while its /jobs listing request is under review.';
  end if;

  if old.listing_review = 'approved' and new.listing_review = 'approved' then
    new.listing_review := 'edited';
    new.listing_reviewed_by := null;
    new.listing_reviewed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists school_jobs_enforce_edit_lock on public.school_jobs;
create trigger school_jobs_enforce_edit_lock
  before update on public.school_jobs
  for each row execute function public.school_jobs_enforce_edit_lock();

-- 4. Site-wide aggregators exclude withdrawn news (own-page feed too — a
--    withdrawal is a retraction, unlike cancel/mark-filled which stay
--    visible with a status label). ------------------------------------------

create or replace view api.public_school_news as
select
  sp.id,
  sp.school_id,
  s.slug as school_slug,
  sp.kind,
  sp.title,
  sp.body,
  sp.source_url,
  sp.published_at,
  sp.post_code,
  sp.slug as post_slug,
  sp.tier,
  sp.listing_requested_at,
  sp.listing_review,
  sp.withdrawn_at
from school_posts sp
join schools s on s.id = sp.school_id
where sp.review = 'approved'
  and s.status = 'published'
  and sp.published_at is not null
  and sp.withdrawn_at is null;

create or replace view api.public_news as
select
  sp.id,
  sp.school_id,
  s.slug as school_slug,
  s.name_en as school_name,
  s.city_id,
  sp.kind,
  sp.title,
  sp.body,
  sp.source_url,
  sp.published_at,
  sp.post_code,
  sp.slug as post_slug,
  sp.tier,
  sp.listing_reviewed_at
from school_posts sp
join schools s on s.id = sp.school_id
where sp.review = 'approved'
  and sp.published_at is not null
  and sp.listing_review = 'approved'
  and sp.withdrawn_at is null
  and s.status = 'published';

-- 5. /admissions discovery page needs city name/slug — reuses
--    api.public_school_admissions unfiltered rather than a new view. --------

create or replace view api.public_school_admissions as
select
  s.id as school_id,
  s.slug,
  s.city_id,
  s.name_en,
  s.name_hi,
  s.tier,
  ac.academic_year,
  ac.class_code,
  ac.status,
  ac.form_mode,
  ac.opens_on,
  ac.closes_on,
  ac.registration_fee,
  ac.form_url,
  ac.last_checked_at,
  ac.verification,
  case when ac.closes_on is not null then ac.closes_on - current_date else null end as days_to_close,
  ac.dob_from,
  ac.dob_to,
  ac.documents_required,
  ac.id as cycle_id,
  c.slug as city_slug,
  c.name_en as city_name
from schools s
join admission_cycles ac on ac.school_id = s.id
left join cities c on c.id = s.city_id
where s.status = 'published';

-- 6. Minimum analytics -- one append-only table, no new platform. -----------
-- "Is this being used" needs: what got viewed, what got shared, what
-- converted, and whether a school's listing request went anywhere. Nothing
-- here to reuse (verification pass found zero analytics infrastructure).

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  school_id uuid references public.schools(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_type_created_idx on public.analytics_events(event_type, created_at);
create index analytics_events_entity_idx on public.analytics_events(entity_type, entity_id);

alter table public.analytics_events enable row level security;

-- Anyone (including anonymous parents on a public page) can log an event —
-- this is write-only telemetry, not a channel to read other people's data.
create policy analytics_events_insert on public.analytics_events
  for insert with check (true);

create policy analytics_events_staff_select on public.analytics_events
  for select using (public.is_staff());
