-- Restore the intended public read surface for SchoolOye's curated api.* views.
-- Raw public-schema tables remain ungranted to anon; these projections are the
-- public contract and enforce school publication, listing approval, source
-- licensing, and confirmed-seat gates within their view definitions.
--
-- The active Skool project had drifted: PostgREST was not exposing api, and
-- several curated views had lost SELECT grants. Keep exposure and grants in
-- version control so an environment rebuild doesn't silently blank directories.
ALTER ROLE authenticator SET pgrst.db_schemas = 'api, public, graphql_public';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

GRANT USAGE ON SCHEMA api TO anon, authenticated;

GRANT SELECT ON
  api.public_admission_updates,
  api.public_areas,
  api.public_boards,
  api.public_cities,
  api.public_corridors,
  api.public_district_filter_options,
  api.public_districts,
  api.public_events,
  api.public_exam_admissions,
  api.public_featured_placements,
  api.public_field_evidence,
  api.public_jobs,
  api.public_localities,
  api.public_locality_neighbors,
  api.public_news,
  api.public_school_admissions,
  api.public_school_boards,
  api.public_school_events,
  api.public_school_jobs,
  api.public_school_news,
  api.public_school_rankings,
  api.public_school_redirects,
  api.public_schools,
  api.public_seat_status,
  api.public_states,
  api.public_teacher_experience,
  api.public_teacher_qualifications,
  api.public_teachers
TO anon, authenticated;
