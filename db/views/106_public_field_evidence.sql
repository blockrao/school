-- api.public_field_evidence: per-field source attribution for the school
-- page's School facts section (Identity & Search Presence Foundation v1,
-- ID-04, 29 Sep 2026).
--
-- field_provenance already holds 85,068 rows covering 10,642 of 10,670
-- schools (mostly UDISE+/Haryana/Delhi bulk imports), 61,895 of them
-- licence_class = 'open' — but none of it reaches the public page yet
-- (src/lib/provenance.ts's header comment names this exact gap: "Deliberately
-- NOT wired to field_provenance in this increment ... would require a new
-- public view filtering to licence_class = 'open'"). This is that view.
--
-- Deliberately does NOT expose `verified_at` as a "checked" date: every
-- licence_class='open' row has verified_at IS NULL (confirmed live, 29 Sep
-- 2026) — these are bulk-import snapshots, not verification events. Exposing
-- `created_at` instead, and the caller must label it "added"/"recorded", never
-- "checked" or "verified" — see components/ui/source-line.tsx's header
-- comment for why this is a separate, deliberately weaker claim than
-- ProvenanceChip's tiers (which are specifically about verification, not mere
-- sourcing).
--
-- Scoped to entity_table='schools' only — this view's one consumer today is
-- the school page's per-field source line. A second consumer (e.g. admission
-- cycles wanting the same treatment) should get its own filtered view rather
-- than this one growing an entity_table branch, matching this codebase's
-- domain-specific-view convention (010_public_schools.sql et al.).
--
-- Must stay owner-run (created as `postgres`, rolbypassrls = true): same
-- reason as public_schools — field_provenance's RLS would otherwise hide
-- every row from anon.
create or replace view api.public_field_evidence as
select
  fp.entity_id as school_id,
  fp.field,
  fp.evidence_url,
  fp.created_at,
  src.name as source_name,
  src.base_url as source_base_url
from field_provenance fp
join sources src on src.id = fp.source_id
where fp.entity_table = 'schools'
  and fp.licence_class = 'open';
