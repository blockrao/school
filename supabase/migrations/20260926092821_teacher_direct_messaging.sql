-- Direct messaging between a parent/user and a claimed teacher listing —
-- the "receive messages / DM" standard feature for the teacher profile
-- (Phase 3, teacher portal). One conversation per (teacher, initiator) pair,
-- so returning to a profile continues the same thread instead of forking a
-- new one. Messages are immutable (no update policy) — a support/abuse
-- trail, not an editable chat log; staff can read everything for moderation.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  initiator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (teacher_id, initiator_id)
);

create index conversations_initiator_idx on public.conversations(initiator_id, last_message_at desc);
create index conversations_teacher_idx on public.conversations(teacher_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- A participant is the initiator, or the user who has claimed the teacher listing.
create policy conversations_participant_select on public.conversations
  for select using (
    initiator_id = auth.uid()
    or exists (select 1 from public.teachers t where t.id = teacher_id and t.claimed_by = auth.uid())
  );

-- Can only start a conversation with a real, claimed, listed teacher — and
-- not with your own listing.
create policy conversations_initiator_insert on public.conversations
  for insert with check (
    initiator_id = auth.uid()
    and exists (
      select 1 from public.teachers t
      where t.id = teacher_id
        and t.claimed_by is not null
        and t.claimed_by <> auth.uid()
        and t.status = 'published'
        and t.is_listed
    )
  );

create policy conversations_staff_select on public.conversations
  for select using (public.is_staff());

create policy messages_participant_select on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      left join public.teachers t on t.id = c.teacher_id
      where c.id = conversation_id
        and (c.initiator_id = auth.uid() or t.claimed_by = auth.uid())
    )
  );

create policy messages_participant_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      left join public.teachers t on t.id = c.teacher_id
      where c.id = conversation_id
        and (c.initiator_id = auth.uid() or t.claimed_by = auth.uid())
    )
  );

create policy messages_staff_select on public.messages
  for select using (public.is_staff());

-- Keeps conversations.last_message_at current for inbox sort order, without
-- granting the client an update policy on conversations.
create function public.messages_touch_conversation() returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.messages_touch_conversation();

create trigger messages_audit
  after insert on public.messages
  for each row execute function public.audit_trigger();
