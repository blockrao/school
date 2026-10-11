-- Structured admission announcements attached to the existing school_posts lifecycle.
-- This migration is additive: it does not drop or alter the legacy admission-cycle
-- tables because exam admissions and cycle-linked historical leads still depend on them.
--
-- The public projection below starts from api.public_school_news, so a detail row
-- cannot independently publish a post or bypass the existing content/listing gates.

CREATE TABLE IF NOT EXISTS public.school_admission_details (
  post_id uuid PRIMARY KEY
    REFERENCES public.school_posts(id) ON DELETE CASCADE,
  academic_year text NOT NULL
    CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$'),
  class_levels text[] NOT NULL
    CHECK (cardinality(class_levels) > 0)
    CHECK (array_position(class_levels, NULL) IS NULL),
  application_opens_on date,
  application_closes_on date,
  application_url text,
  eligibility_summary text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_admission_details_date_order
    CHECK (
      application_opens_on IS NULL
      OR application_closes_on IS NULL
      OR application_closes_on >= application_opens_on
    ),
  CONSTRAINT school_admission_details_https_application_url
    CHECK (
      application_url IS NULL
      OR application_url ~* '^https://[^[:space:]]+$'
    ),
  CONSTRAINT school_admission_details_eligibility_length
    CHECK (
      eligibility_summary IS NULL
      OR char_length(eligibility_summary) <= 4000
    )
);

CREATE INDEX IF NOT EXISTS school_admission_details_year_close_idx
  ON public.school_admission_details (academic_year, application_closes_on);

ALTER TABLE public.school_admission_details ENABLE ROW LEVEL SECURITY;

-- No direct grants to anon/authenticated: all public reads go through the
-- curated API view and writes must be added with the verified school-owner
-- authorization flow in a subsequent application change.
REVOKE ALL ON public.school_admission_details FROM anon, authenticated;

CREATE OR REPLACE VIEW api.public_school_admission_announcements AS
SELECT
  news.id AS post_id,
  news.school_id,
  news.school_slug,
  news.school_name,
  news.city_id,
  news.kind,
  news.title,
  news.body,
  news.source_url,
  news.published_at,
  news.post_code,
  news.post_slug,
  news.tier,
  details.academic_year,
  details.class_levels,
  details.application_opens_on,
  details.application_closes_on,
  details.application_url,
  details.eligibility_summary,
  details.updated_at AS admission_details_updated_at
FROM api.public_school_news AS news
JOIN public.school_admission_details AS details
  ON details.post_id = news.id
WHERE news.withdrawn_at IS NULL;

COMMENT ON TABLE public.school_admission_details IS
  'Structured metadata for admission announcement posts; publication and listing eligibility remain controlled by school_posts and api.public_school_news.';
COMMENT ON VIEW api.public_school_admission_announcements IS
  'Public admission announcements derived only from the curated public_school_news projection; this view does not publish or approve posts.';
