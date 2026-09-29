-- Outreach-readiness heuristic v1 (Identity & Search Presence Foundation v1,
-- ID-06, 29 Sep 2026).
--
-- Deliberately NOT a persisted view/table/enum yet — a query to run by hand
-- (Supabase SQL editor or `psql $DATABASE_URL`) while picking pilot/outreach
-- targets. Building a formal IDENTITY_READY/PAGE_READY/.../OUTREACH_READY
-- state machine before these criteria have been used and corrected on a real
-- pilot would be guessing at the schema twice instead of once — exactly the
-- redo this work is trying to avoid. Once these criteria hold up across a
-- real pilot list, promote this into a real (staff-only, NOT api-schema) view.
--
-- Current criteria (adjust as the pilot teaches you more):
--   - district is one of the 24 slugs actually wired into a sitemap route
--     file (src/lib/sitemap.ts LAUNCH_CITY_SLUGS) — NOTE this is a stricter,
--     more accurate bar than districts.is_launch-equivalent logic
--     (db/views/040_public_areas.sql), which only requires >=1 published
--     school in the district and is true for far more districts than are
--     actually in any sitemap file. A school not in the sitemap has no path
--     to Google's crawler through this app at all, so that's the real gate.
--   - published, not merged into another record
--   - has at least one real external identifier (UDISE+ code or a board
--     affiliation) — an actual authority stands behind this record, not just
--     a name+address SchoolOye compiled itself
--   - has enough substance that the page isn't thin: address, a class range,
--     and management all present
--
-- This does NOT check "is Google actually showing this page yet" — that's a
-- separate, manual step per docs/ops/implementation-log.md's Search
-- Validation section (GSC verified, sitemap submitted, URL Inspection
-- checked, branded query checked by hand). This query only narrows "which
-- schools are worth spending that manual step on."

select
  s.id,
  s.name_en,
  s.slug,
  d.slug as district_slug,
  s.udise_code,
  sa.affiliation_no as cbse_affiliation_no,
  b.name_en as board_name
from schools s
join districts d on d.id = s.district_id
left join school_affiliations sa on sa.school_id = s.id
left join boards b on b.id = sa.board_id
where s.status = 'published'
  and s.merged_into is null
  and (s.udise_code is not null or sa.affiliation_no is not null)
  and s.address is not null
  and (s.min_class is not null or s.max_class is not null)
  and s.management is not null
  -- Keep this list in sync with src/lib/sitemap.ts's LAUNCH_CITY_SLUGS by
  -- hand — it's a short, deliberately curated list there, not derived from
  -- is_launch, so it's copied here rather than queried from a view.
  and d.slug in (
    'jaipur', 'gurugram', 'delhi', 'faridabad', 'hisar', 'sonipat', 'panipat',
    'karnal', 'bhiwani', 'rohtak', 'mahendragarh', 'rewari', 'ambala',
    'panchkula', 'charkhi-dadri', 'fatehabad', 'jhajjar', 'jind', 'kaithal',
    'kurukshetra', 'nuh-mewat', 'palwal', 'sirsa', 'yamunanagar'
  )
order by d.slug, s.name_en;
