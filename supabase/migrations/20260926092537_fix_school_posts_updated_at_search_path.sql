-- Advisor flagged school_posts_set_updated_at for a mutable search_path
-- (function_search_path_mutable) — pin it like every other function here.
create or replace function public.school_posts_set_updated_at() returns trigger
  language plpgsql
  set search_path to 'public'
  as $$
begin
  new.updated_at = now();
  return new;
end $$;
