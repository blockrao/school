-- api.public_seat_status: OpenSeat vacancy reports. Column shape matches the
-- pre-existing public.public_seat_status view; this adds the published-schools
-- filter (the original had none) and moves it into the api schema.
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
where exists (
  select 1 from schools s where s.id = ss.school_id and s.status = 'published'
);
