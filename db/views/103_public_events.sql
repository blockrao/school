-- api.public_events: the SITE-WIDE /events aggregator feed (SEO/GEO
-- follow-up, 29 Sep 2026, 20260929050000_events_and_news_depth.sql). A school
-- event only appears here once the school has requested a listing AND ops
-- has approved it (`listing_review = 'approved'`) — the school's own-page
-- feed (102_public_school_events.sql) has no such gate. Cancelled events are
-- excluded from the active aggregator (the canonical page itself still
-- resolves and is left for 103's/entity page's own-page display, not this
-- feed) — nobody should discover a cancelled event as if it were live.
-- `starts_at`/`ends_at` are exposed as-is; Upcoming/Ongoing/Completed is a
-- derived, render-time state (mirrors deadlineState()), never stored here.
create or replace view api.public_events as
select
  se.id,
  se.school_id,
  s.slug as school_slug,
  s.name_en as school_name,
  s.city_id,
  se.event_code,
  se.slug as event_slug,
  se.event_type,
  se.title,
  se.description,
  se.starts_at,
  se.ends_at,
  se.location,
  se.class_codes,
  se.registration_url,
  se.source_url,
  se.listing_reviewed_at
from school_events se
join schools s on s.id = se.school_id
where se.listing_review = 'approved'
  and se.cancelled_at is null
  and s.status = 'published';

grant select on api.public_events to anon, authenticated;
