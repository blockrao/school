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
--
-- FIX (Identity Layer Pilot & Closure, item 4/11, 29 Sep 2026): the original
-- version of this query filtered `d.slug in (..., 'delhi', ...)` directly
-- against districts.slug. That literal 'delhi' district slug does not exist —
-- Delhi is modelled as a city-state (states.is_city_state, D-126,
-- db/views/040_public_areas.sql): its 1,874 schools are split across 9 real
-- NCT district rows (new-delhi, north-delhi, north-west-delhi, west-delhi,
-- central-delhi, south-west-delhi, south-delhi, east-delhi, north-east-delhi),
-- and LAUNCH_CITY_SLUGS' "delhi" entry maps to the *state* slug via
-- getPublicCityAreaBySlug, not a district slug. So the original WHERE clause
-- silently matched zero Delhi schools and this query reported "0 schools
-- passing in Delhi" as if that were a finding about Delhi's data quality —
-- it was a bug in this query. Corrected count as of 29 Sep 2026: 111 of 1,184
-- published Delhi schools pass the full bar (bottleneck is has_identifier:
-- only 219/1,184 have a UDISE-exact match or a CBSE affiliation number yet).
-- The sitemap itself was never affected — buildCitySitemapResponse resolves
-- "delhi" through getPublicCityAreaBySlug -> api.public_areas, which already
-- does the city-state -> district_ids expansion correctly; only this
-- hand-written outreach query had the bug.

select
  s.id,
  s.name_en,
  s.slug,
  coalesce(city_state.slug, d.slug) as area_slug,
  sa.affiliation_no as cbse_affiliation_no,
  b.name_en as board_name
from schools s
join districts d on d.id = s.district_id
join states st on st.id = d.state_id
left join states city_state on city_state.id = st.id and city_state.is_city_state
left join school_affiliations sa on sa.school_id = s.id
left join boards b on b.id = sa.board_id
where s.status = 'published'
  and s.merged_into is null
  and (
    sa.affiliation_no is not null
    or exists (
      select 1 from source_records sr
      join sources src on src.id = sr.source_id
      where sr.matched_school_id = s.id
        and src.code = 'udise'
        and sr.match_confidence = 1.000
        and sr.match_method = 'udise_direct_lookup'
    )
    -- Once the 20260929100000_school_udise_identity.sql migration is applied,
    -- replace the exists(...) above with the simpler `or s.udise_code is not null`.
  )
  and s.address is not null
  and (s.min_class is not null or s.max_class is not null)
  and s.management is not null
  -- Keep this list in sync with src/lib/sitemap.ts's LAUNCH_CITY_SLUGS by
  -- hand — it's a short, deliberately curated list there, not derived from
  -- is_launch, so it's copied here rather than queried from a view. Matches
  -- against the *area* slug (district slug, or the city-state's state slug
  -- for Delhi) — never against districts.slug alone, per the fix above.
  and (
    (st.is_city_state and st.slug = 'delhi')
    or d.slug in (
      'jaipur', 'gurugram', 'faridabad', 'hisar', 'sonipat', 'panipat',
      'karnal', 'bhiwani', 'rohtak', 'mahendragarh', 'rewari', 'ambala',
      'panchkula', 'charkhi-dadri', 'fatehabad', 'jhajjar', 'jind', 'kaithal',
      'kurukshetra', 'nuh-mewat', 'palwal', 'sirsa', 'yamunanagar'
    )
  )
order by area_slug, s.name_en;
