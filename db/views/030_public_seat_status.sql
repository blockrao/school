-- api.public_seat_status: OpenSeat vacancy reports. Column shape matches the
-- pre-existing public.public_seat_status view.
--
-- Does not filter on schools.status — see 010_public_schools.sql's header for
-- why. Must stay owner-run (same note applies).
--
-- Filters on confirmed_at IS NOT NULL as of the School Portal flow (Flow 4.13):
-- seat_status now accepts self-reported rows from school members (RLS in
-- supabase/migrations/20260925*_schools_flow_policies.sql, WITH CHECK forces
-- confirmed_at IS NULL on a self-report), and this is the only gate keeping an
-- unreviewed self-report off OpenSeat until staff confirms it. Safe to add —
-- the table had zero rows before this change, so no existing published data
-- could regress.
create or replace view api.public_seat_status as
select
  ss.school_id,
  ss.academic_year,
  ss.class_code,
  ss.public_status,
  ss.range_label,
  ss.confidence,
  ss.mid_session_accepted,
  ss.reported_at,
  ss.confirmed_at
from seat_status ss
where ss.confirmed_at is not null;
