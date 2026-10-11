-- Accelerate the public school name search used by /[locale]/schools.
-- The UI uses ILIKE '%term%' against api.public_schools, a view over
-- public.schools. Without a trigram index PostgreSQL may scan the entire
-- school table for every uncached search request.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS schools_public_name_en_trgm_idx
  ON public.schools
  USING gin (name_en gin_trgm_ops)
  WHERE status IN ('published', 'closed')
    AND merged_into IS NULL;
