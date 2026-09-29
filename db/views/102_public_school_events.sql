-- api.public_school_events: each school's OWN-PAGE events feed (SEO/GEO
-- follow-up, 29 Sep 2026, 20260929050000_events_and_news_depth.sql). Mirrors
-- 095_public_school_news.sql's shape exactly: `school_events` stays fully
-- RLS-protected (school members see/author only their own school's rows,
-- staff see everything, no anon policy on the base table); this view exposes
-- every event for a published school regardless of `listing_review`, because
-- creating an event makes it live on the school's OWN page immediately —
-- there is no ops pre-review for that tier of visibility. Cancelled events
-- are still returned (with `cancelled_at` exposed) rather than hidden, so the
-- school's own page can show "Cancelled" instead of the event silently
-- vanishing — the canonical page persists per Prav's "stays there forever"
-- requirement. See 103_public_events.sql for the site-wide, listing_review=
-- 'approved'-gated aggregator.
create or replace view api.public_school_events as
select
  se.id,
  se.school_id,
  s.slug as school_slug,
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
  se.cancelled_at,
  se.listing_requested_at,
  se.listing_review
from school_events se
join schools s on s.id = se.school_id
where s.status = 'published';

grant select on api.public_school_events to anon, authenticated;
