-- api.public_seat_status: OpenSeat vacancy reports. Column shape matches the
-- pre-existing public.public_seat_status view.
--
-- Does not filter on schools.status — see 010_public_schools.sql's header for
-- why. Must stay owner-run (same note applies).
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
from seat_status ss;
