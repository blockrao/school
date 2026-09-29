-- Source-name display fix (29 Sep 2026).
--
-- api.public_field_evidence.source_name (SourceLine, src/components/ui/source-line.tsx)
-- renders `sources.name` verbatim on the public school page. Row id=11's name,
-- "CBSE SARAS (via Wayback Machine / Common Crawl archive)", read as clunky/
-- technical to a parent reading a school page — flagged by Prav for cleanup.
--
-- Deliberately NOT collapsed to plain "CBSE SARAS": that would make this row
-- visually indistinguishable on the page from sources.id=4, "CBSE SARAS
-- affiliation directory" (base_url saras.cbse.gov.in, the live site). Row 11's
-- base_url is web.archive.org — this evidence came from an archived snapshot,
-- not the live record, which may be materially staler than a live fetch. That
-- distinction is exactly the kind of honest-freshness signal this session's
-- other work (dateModified, the two-clock model, SDP-31) has been building;
-- silently dropping it from the one place a reader can see it would undercut
-- that, not just tidy up copy. "(archived copy)" keeps the signal in far
-- fewer words.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20260929113422_shorten_saras_archive_source_name.sql --confirm`.

update public.sources
set name = 'CBSE SARAS (archived copy)'
where id = 11
  and name = 'CBSE SARAS (via Wayback Machine / Common Crawl archive)';
