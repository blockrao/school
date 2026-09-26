-- School-authored news/PR publications — the piece of "manage their own
-- listing" the portal didn't have yet (seat status, admission notices, and
-- correction requests already existed; a school had no way to publish news
-- of its own, e.g. "we won X award", "new campus opening").
-- Same review workflow as admission_notices: school submits, ops reviews
-- (review_status, reused), only 'approved' rows are meant to go public.
-- Public display (a News tab on the school page) is a follow-up — the tabs
-- infra for Fees/Facilities/Teachers is already deferred pending real data,
-- so this migration only builds the write side + ops review; see screen-map.

create type public.post_kind as enum ('news', 'press');

create table public.school_posts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  kind public.post_kind not null default 'news',
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  source_url text,
  review public.review_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index school_posts_school_id_idx on public.school_posts(school_id);
create index school_posts_review_idx on public.school_posts(review) where review = 'pending';

alter table public.school_posts enable row level security;

-- School members can see and author their own school's posts.
create policy school_posts_member_select on public.school_posts
  for select using (public.is_school_member(school_id));

create policy school_posts_member_insert on public.school_posts
  for insert with check (public.is_school_member(school_id) and created_by = auth.uid());

-- A school can edit its own post only while it hasn't been reviewed yet —
-- once ops has approved or rejected it, further changes go through a new
-- submission, same as admission_notices' review-then-lock shape.
create policy school_posts_member_update_pending on public.school_posts
  for update using (public.is_school_member(school_id) and review = 'pending')
  with check (public.is_school_member(school_id));

-- Staff review every post; anon/public read nothing here yet (no public
-- consumer built this pass — see the migration comment above).
create policy school_posts_staff_all on public.school_posts
  for all using (public.is_staff()) with check (public.is_staff());

create trigger school_posts_audit
  after insert or update or delete on public.school_posts
  for each row execute function public.audit_trigger();

-- public.update_updated_at_column() doesn't exist (only storage.* has one) —
-- a small dedicated function instead of reaching into the storage schema.
create function public.school_posts_set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger school_posts_set_updated_at
  before update on public.school_posts
  for each row execute function public.school_posts_set_updated_at();
