-- Keep raw school-post records inaccessible to anonymous clients.
-- Public news is served through the curated api schema views.
REVOKE ALL PRIVILEGES ON TABLE public.school_posts FROM anon;
