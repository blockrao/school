-- claude_ro: read-only visibility into SCHOOL data for analysis. Never personal tables.
-- Postgres combines RLS policies with OR, so this adds visibility for claude_ro only;
-- it changes nothing for anon, authenticated, or existing policies on these tables.
do $$
declare t text;
begin
  foreach t in array array[
    'schools','school_affiliations','school_identifiers','school_facilities','school_media',
    'school_slug_history','fee_items','admission_cycles','admission_notices','seat_status',
    'states','districts','cities','localities','boards','class_levels','facilities',
    'sources','source_records','field_provenance','data_quality_flags'
  ] loop
    execute format(
      'create policy claude_ro_analysis_read on public.%I for select to claude_ro using (true)', t);
  end loop;
end $$;
-- Explicitly NOT: profiles, children, consents, alert_*, applications, application_orders,
-- documents, enquiries, shortlists, invoices, sales_*, school_claims, school_members, audit_log, ops_tasks.
