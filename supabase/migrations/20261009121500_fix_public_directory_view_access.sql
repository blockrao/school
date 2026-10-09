-- Restore the intended public read surface for the school, teacher and exam
-- directories. These are curated api.* views, not raw public tables.
--
-- The active Skool project returned PGRST106/PGRST205 for api.* reads until
-- PostgREST was explicitly configured to expose api. Keep this role setting
-- aligned with the live project's manual Data API configuration.
ALTER ROLE authenticator SET pgrst.db_schemas = 'api, public, graphql_public';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- The public directory views were introduced after the original api-view
-- grants migration, so the base grants did not cover them in this database.
GRANT SELECT ON api.public_areas TO anon, authenticated;
GRANT SELECT ON api.public_district_filter_options TO anon, authenticated;

GRANT SELECT ON api.public_teachers TO anon, authenticated;
GRANT SELECT ON api.public_teacher_experience TO anon, authenticated;
GRANT SELECT ON api.public_teacher_qualifications TO anon, authenticated;

GRANT SELECT ON api.public_exam_admissions TO anon, authenticated;
