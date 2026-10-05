-- api.public_district_filter_options: the board and grade-range filter choices
-- that actually exist in each district — one row per (district, kind, value).
--
-- Replaces a client-side computation in listDistrictFilterOptions
-- (src/lib/db/public-adapter.ts) that fetched EVERY school id in the district and
-- then put them all in the URL of a second query. That broke twice over as
-- districts grow: URLs of ~38 bytes per school (810 schools in the largest
-- district = ~30 KB) approach proxy limits, and PostgREST's default 1,000-row cap
-- silently truncates the school list past that point, dropping filter options
-- without any error. Computing it here returns a few dozen rows per district.
--
-- kind = 'board'     -> value is the board id (as text), label the board name
-- kind = 'max_class' -> value and label are the grade-range code
--
-- Built only on api.public_schools / api.public_school_boards, so it inherits
-- both views' publish gate and the CBSE/CISCE allowlist — nothing new is exposed.
create or replace view api.public_district_filter_options as
select
  s.district_id,
  'board'::text as kind,
  b.board_id::text as value,
  b.board_name as label
from api.public_schools s
join api.public_school_boards b on b.school_id = s.id
where s.district_id is not null
group by s.district_id, b.board_id, b.board_name
union all
select
  s.district_id,
  'max_class'::text as kind,
  s.max_class as value,
  s.max_class as label
from api.public_schools s
where s.district_id is not null
  and s.max_class is not null
group by s.district_id, s.max_class;

grant select on api.public_district_filter_options to anon, authenticated;
