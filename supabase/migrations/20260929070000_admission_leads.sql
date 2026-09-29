-- Admission leads (Prav, 29 Sep 2026): "currently we are sending user to the
-- school website whereas we should capture the lead and verify and then
-- provide to schools."
--
-- Design: the per-cycle "Application form" CTA on a school's own page stops
-- being a raw external link. Instead, a signed-in (phone-OTP-verified, so
-- already "verified" in the same sense the rest of this app uses that word)
-- parent applies for a specific class/session through SchoolOye, and the
-- school gets the lead directly in its portal. The school's own official
-- form link stays available as a secondary, clearly-labelled option (some
-- schools' actual admission process still requires it) -- this is a lead
-- capture layer in front of that, not a replacement for it.
--
-- Unlike the existing `enquiries` "Ask this school" flow (SDP-04's
-- controlled-intermediary model, which deliberately never hands a parent's
-- contact details to the school), an admission application is a deliberate,
-- single-recipient act: the parent is choosing to give this one school their
-- details so it can process their application, same as filling a paper form
-- in person. `consent_at` records that this was explicit and per-application,
-- not a blanket opt-in -- captured by the app requiring a checked consent
-- checkbox before insert, not by a trigger.
create type public.admission_lead_status as enum ('new', 'contacted', 'closed');

create table public.admission_leads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  admission_cycle_id uuid not null references public.admission_cycles(id) on delete cascade,
  class_code text not null,
  academic_year text not null,
  user_id uuid not null references auth.users(id),
  full_name text,
  phone text,
  note text check (note is null or char_length(note) <= 1000),
  consent_at timestamptz not null default now(),
  status public.admission_lead_status not null default 'new',
  status_updated_by uuid references auth.users(id),
  status_updated_at timestamptz,
  created_at timestamptz not null default now()
);

-- One application per parent per cycle -- resubmitting the same class/session
-- is almost always a double-click, not a second real application.
create unique index admission_leads_cycle_user_unique on public.admission_leads (admission_cycle_id, user_id);
create index admission_leads_school_status_idx on public.admission_leads (school_id, status);

alter table public.admission_leads enable row level security;

-- Parents insert their own lead directly (not through school_members --
-- they're never a member of the school they're applying to).
create policy admission_leads_own_insert on public.admission_leads
  for insert with check (auth.uid() = user_id);

create policy admission_leads_member_select on public.admission_leads
  for select using (public.is_school_member(school_id));

-- Schools update status only (new -> contacted -> closed) as they work the
-- lead; the app only ever writes status/status_updated_* from the portal.
create policy admission_leads_member_update on public.admission_leads
  for update using (public.is_school_member(school_id))
  with check (public.is_school_member(school_id));

create policy admission_leads_staff_all on public.admission_leads
  for all using (public.is_staff()) with check (public.is_staff());

create trigger admission_leads_audit
  after insert or update or delete on public.admission_leads
  for each row execute function public.audit_trigger();
