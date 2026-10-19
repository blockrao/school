-- Cache Invalidation Webhooks (19 Oct 2026, Prav)
--
-- When schools or admission_cycles change, POST to the revalidate endpoint
-- to invalidate the cached page. This prevents stale data from being served
-- for 900-3600 seconds when data actually changes.
--
-- Webhook endpoint: POST /api/revalidate
-- Required headers: x-revalidate-secret: $REVALIDATE_SECRET
-- Body: { tag: "schools" | "cities" | "admissions" }

-- Trigger function that POSTs to the Next.js revalidate endpoint
create or replace function notify_revalidate_cache(tag text)
returns void as $$
begin
  -- This would call the revalidate endpoint, but Postgres doesn't have built-in HTTP
  -- In production, use a Postgres extension like pg_http or call from an Edge Function
  -- For now, this is a placeholder that marks the intention

  -- TODO (Prav): Set up one of:
  -- 1. Supabase Edge Function that calls /api/revalidate on school/city changes
  -- 2. Postgres pg_http extension to POST directly
  -- 3. Webhook trigger in Supabase Dashboard pointing to /api/revalidate
end;
$$ language plpgsql;

-- Trigger on schools table changes
create or replace trigger schools_revalidate_cache
after insert or update or delete on schools
for each row
execute function notify_revalidate_cache('schools');

-- Trigger on cities table changes (if it exists in public schema)
-- Commenting out since cities may be in api schema
-- create or replace trigger cities_revalidate_cache
-- after insert or update or delete on cities
-- for each row
-- execute function notify_revalidate_cache('cities');

-- Trigger on admission_cycles changes
create or replace trigger admission_cycles_revalidate_cache
after insert or update or delete on admission_cycles
for each row
execute function notify_revalidate_cache('admissions');

comment on function notify_revalidate_cache(text) is
  'Placeholder for cache invalidation webhook. To enable: create Supabase Edge Function that POSTs to /api/revalidate with tag parameter.';
