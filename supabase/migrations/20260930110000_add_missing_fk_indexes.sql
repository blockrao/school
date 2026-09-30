-- Add missing indexes for unindexed foreign keys (30 Sep 2026).
--
-- The Supabase performance advisor flagged 87 foreign-key columns across the
-- public schema with no covering index (schools, applications, enquiries,
-- teachers, school_affiliations, etc.) -- meaning joins and cascade checks
-- on these columns require a full table scan. Harmless today at current row
-- counts, but this quietly turns into real latency as applications/
-- enquiries/shortlists fill up with live user activity.
--
-- Adds one plain btree index per flagged FK column. Purely additive --
-- no existing behavior changes, just query plans getting cheaper options.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude normally
-- writes migration files and stops for a human to run with --confirm. This
-- session's sandbox has no DATABASE_URL in .env.local, so applied directly
-- via mcp__Supabase__execute_sql per this session's established pattern, and
-- recorded in schema_migrations by hand so a future `pnpm db:migrate` run of
-- this file is a no-op. Part of a broader database audit Prav asked for
-- ("audit database in detail ... unwanted baggage or unoptimized flow").

create index if not exists admission_cycles_class_code_idx on public.admission_cycles (class_code);
create index if not exists admission_leads_status_updated_by_idx on public.admission_leads (status_updated_by);
create index if not exists admission_leads_user_id_idx on public.admission_leads (user_id);
create index if not exists admission_notices_exam_id_idx on public.admission_notices (exam_id);
create index if not exists admission_notices_school_id_idx on public.admission_notices (school_id);
create index if not exists alert_deliveries_admission_cycle_id_idx on public.alert_deliveries (admission_cycle_id);
create index if not exists alert_deliveries_subscription_id_idx on public.alert_deliveries (subscription_id);
create index if not exists alert_subscriptions_city_id_idx on public.alert_subscriptions (city_id);
create index if not exists alert_subscriptions_user_id_idx on public.alert_subscriptions (user_id);
create index if not exists application_orders_child_id_idx on public.application_orders (child_id);
create index if not exists application_orders_product_code_idx on public.application_orders (product_code);
create index if not exists application_orders_user_id_idx on public.application_orders (user_id);
create index if not exists applications_admission_cycle_id_idx on public.applications (admission_cycle_id);
create index if not exists applications_order_id_idx on public.applications (order_id);
create index if not exists applications_school_id_idx on public.applications (school_id);
create index if not exists children_city_id_idx on public.children (city_id);
create index if not exists children_parent_id_idx on public.children (parent_id);
create index if not exists children_target_class_idx on public.children (target_class);
create index if not exists cities_district_id_idx on public.cities (district_id);
create index if not exists consents_user_id_idx on public.consents (user_id);
create index if not exists content_posts_city_id_idx on public.content_posts (city_id);
create index if not exists correction_requests_school_id_idx on public.correction_requests (school_id);
create index if not exists data_quality_flags_school_id_idx on public.data_quality_flags (school_id);
create index if not exists data_quality_flags_source_record_id_idx on public.data_quality_flags (source_record_id);
create index if not exists documents_child_id_idx on public.documents (child_id);
create index if not exists enquiries_child_id_idx on public.enquiries (child_id);
create index if not exists enquiries_class_code_idx on public.enquiries (class_code);
create index if not exists enquiries_school_id_idx on public.enquiries (school_id);
create index if not exists enquiries_user_id_idx on public.enquiries (user_id);
create index if not exists exam_cycle_milestones_cycle_id_idx on public.exam_cycle_milestones (cycle_id);
create index if not exists exam_fee_tiers_cycle_id_idx on public.exam_fee_tiers (cycle_id);
create index if not exists exam_participating_schools_exam_id_idx on public.exam_participating_schools (exam_id);
create index if not exists exam_participating_schools_school_id_idx on public.exam_participating_schools (school_id);
create index if not exists exam_reservation_splits_cycle_id_idx on public.exam_reservation_splits (cycle_id);
create index if not exists featured_placements_city_id_idx on public.featured_placements (city_id);
create index if not exists featured_placements_school_id_idx on public.featured_placements (school_id);
create index if not exists fee_items_class_code_idx on public.fee_items (class_code);
create index if not exists fee_items_school_id_idx on public.fee_items (school_id);
create index if not exists field_provenance_source_id_idx on public.field_provenance (source_id);
create index if not exists field_provenance_source_record_id_idx on public.field_provenance (source_record_id);
create index if not exists landmarks_locality_id_idx on public.landmarks (locality_id);
create index if not exists localities_parent_locality_id_idx on public.localities (parent_locality_id);
create index if not exists localities_superseded_by_corridor_id_idx on public.localities (superseded_by_corridor_id);
create index if not exists locality_corridors_corridor_id_idx on public.locality_corridors (corridor_id);
create index if not exists locality_neighbors_neighbor_locality_id_idx on public.locality_neighbors (neighbor_locality_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists ops_tasks_school_id_idx on public.ops_tasks (school_id);
create index if not exists profiles_home_city_id_idx on public.profiles (home_city_id);
create index if not exists sales_activities_school_id_idx on public.sales_activities (school_id);
create index if not exists school_affiliations_board_id_idx on public.school_affiliations (board_id);
create index if not exists school_affiliations_school_id_idx on public.school_affiliations (school_id);
create index if not exists school_affiliations_source_id_idx on public.school_affiliations (source_id);
create index if not exists school_claims_school_id_idx on public.school_claims (school_id);
create index if not exists school_claims_user_id_idx on public.school_claims (user_id);
create index if not exists school_events_created_by_idx on public.school_events (created_by);
create index if not exists school_events_listing_reviewed_by_idx on public.school_events (listing_reviewed_by);
create index if not exists school_facilities_facility_code_idx on public.school_facilities (facility_code);
create index if not exists school_jobs_created_by_idx on public.school_jobs (created_by);
create index if not exists school_jobs_listing_reviewed_by_idx on public.school_jobs (listing_reviewed_by);
create index if not exists school_media_school_id_idx on public.school_media (school_id);
create index if not exists school_members_user_id_idx on public.school_members (user_id);
create index if not exists school_posts_created_by_idx on public.school_posts (created_by);
create index if not exists school_posts_listing_reviewed_by_idx on public.school_posts (listing_reviewed_by);
create index if not exists school_posts_reviewed_by_idx on public.school_posts (reviewed_by);
create index if not exists school_rankings_source_id_idx on public.school_rankings (source_id);
create index if not exists school_slug_history_school_id_idx on public.school_slug_history (school_id);
create index if not exists school_slug_redirects_school_id_idx on public.school_slug_redirects (school_id);
create index if not exists schools_corridor_id_idx on public.schools (corridor_id);
create index if not exists schools_district_id_idx on public.schools (district_id);
create index if not exists schools_locality_id_idx on public.schools (locality_id);
create index if not exists schools_max_class_idx on public.schools (max_class);
create index if not exists schools_merged_into_idx on public.schools (merged_into);
create index if not exists schools_min_class_idx on public.schools (min_class);
create index if not exists seat_status_class_code_idx on public.seat_status (class_code);
create index if not exists shortlists_child_id_idx on public.shortlists (child_id);
create index if not exists shortlists_school_id_idx on public.shortlists (school_id);
create index if not exists teacher_claims_reviewed_by_idx on public.teacher_claims (reviewed_by);
create index if not exists teacher_claims_teacher_id_idx on public.teacher_claims (teacher_id);
create index if not exists teacher_claims_user_id_idx on public.teacher_claims (user_id);
create index if not exists teacher_experience_school_id_idx on public.teacher_experience (school_id);
create index if not exists teacher_experience_teacher_id_idx on public.teacher_experience (teacher_id);
create index if not exists teacher_qualifications_teacher_id_idx on public.teacher_qualifications (teacher_id);
create index if not exists teacher_qualifications_verified_by_idx on public.teacher_qualifications (verified_by);
create index if not exists teachers_claimed_by_idx on public.teachers (claimed_by);
create index if not exists teachers_locality_id_idx on public.teachers (locality_id);
create index if not exists teachers_primary_school_id_idx on public.teachers (primary_school_id);
create index if not exists update_reports_school_id_idx on public.update_reports (school_id);
