-- api: production-readable views (anon key). staging: analysis-only views, readable
-- by claude_ro alone, never queried by the app. See docs/spec/data-and-trust.md.
create schema if not exists api;
create schema if not exists staging;
