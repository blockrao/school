-- Closes the two "foreign key without a covering index" performance
-- advisories raised right after 20260929090000_activity_admissions_v1.sql
-- for analytics_events (school_id, user_id) — cheap indexes, no schema
-- change, added same day as part of the P1.8 minimum-analytics work rather
-- than left for a future pass.
create index if not exists analytics_events_school_id_idx on public.analytics_events(school_id);
create index if not exists analytics_events_user_id_idx on public.analytics_events(user_id);
