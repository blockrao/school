-- Performance: Lightweight Projection Views (19 Oct 2026)
--
-- Problem: api.public_schools selects 88 columns on every query.
-- Listing pages only need 5-10 columns, wasting 3-5 KB per row.
--
-- Solution: Create lightweight views for common access patterns.
-- city listing pages: use api.public_schools_listing (20 columns)
-- entity pages: continue using api.public_schools (full 88 columns)
--
-- This reduces bandwidth by ~60% on city/locality listing pages.

-- Lightweight listing view: city pages, comparison, browse
-- Includes: identity, location, board, fees, rating, contact
create or replace view api.public_schools_listing as
select
  s.id,
  s.school_code,
  s.slug,
  s.name_en,
  s.name_hi,
  s.district_id,
  s.city_id,
  s.locality_id,
  l.slug as locality_slug,
  l.name_en as locality_name,
  s.address,
  s.pincode,
  s.lat,
  s.lng,
  s.min_class,
  s.max_class,
  s.board_affiliation,
  s.annual_fee,
  s.rating,
  s.review_count,
  s.status::text as status
from schools s
left join localities l on l.id = s.locality_id
where s.status in ('published', 'closed') and s.merged_into is null;

-- Grant access
grant select on api.public_schools_listing to anon, authenticated;

-- Entity page view: full schema for /school/{slug}
-- (api.public_schools already serves this; this comment is for documentation)
comment on view api.public_schools_listing is 'Lightweight projection for listing pages (19 Oct 2026): identity + location + board + fees + rating. ~60% smaller payload than api.public_schools.';
