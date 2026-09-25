-- Flow 4.13 (School Portal): new RLS policies letting a verified school member
-- submit self-reported data that goes into staff review before it's public.
-- None of these tables hold personal/children's data (school business data
-- only) — additive CREATE POLICY, same self-apply authority as a GRANT.

-- admission_notices: a school member can submit a notice for their own school,
-- but only ever as pending/unreviewed — review, reviewed_by, reviewed_at and
-- promoted_to_golden are staff-only to set (WITH CHECK blocks self-approval).
-- They can also see their own school's notices to track status.
create policy admission_notices_member_insert on admission_notices
  for insert to authenticated
  with check (
    is_school_member(school_id)
    and review = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and promoted_to_golden = false
  );

create policy admission_notices_member_select on admission_notices
  for select to authenticated
  using (is_school_member(school_id));

-- seat_status: a school member can report their own seat status, but
-- confirmed_at must stay null on a self-report — that's the only thing keeping
-- it off api.public_seat_status (see 030_public_seat_status.sql) until staff
-- confirms it via /ops. They can also update their own still-unconfirmed rows
-- (correcting a report before staff gets to it), but never one staff already
-- confirmed, and never confirmed_at itself.
create policy seat_status_member_insert on seat_status
  for insert to authenticated
  with check (is_school_member(school_id) and confirmed_at is null);

create policy seat_status_member_update on seat_status
  for update to authenticated
  using (is_school_member(school_id) and confirmed_at is null)
  with check (is_school_member(school_id) and confirmed_at is null);

-- correction_requests: a school member can request an edit to their own
-- school's profile fields — staff applies it after review
-- (correction_requests_staff_all already covers the staff side). No self-read
-- policy: the table has no submitter-identity column to scope it by, and
-- tracking status isn't required for this flow — see this session's report.
create policy correction_requests_member_insert on correction_requests
  for insert to authenticated
  with check (is_school_member(school_id));
