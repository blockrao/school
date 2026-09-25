-- Additive: 20260925094409_narrow_enquiries_grants.sql (Flow 2.11) narrowed
-- enquiries to insert-only, before the Portal dashboard (Flow 4.13) existed and
-- needed to read a school's own enquiries. enq_read RLS already allows the
-- submitter, the school's own members, or staff — this just lets the grant
-- catch up to that policy for the school-member case; a parent still can't
-- select their own submitted enquiry (never needed it, no regression there).

grant select on enquiries to authenticated;
