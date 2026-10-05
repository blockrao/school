-- Fix mislabeled source_type on the bulk-imported school dataset (5 Oct 2026).
--
-- Found while investigating why Faridabad showed 810 "published" schools: every
-- one of them (and, it turns out, 10,634 of the 10,670 schools in the whole
-- table -- 99.7%, across every district and every status) carries
-- source_type='user_submitted'. That label is false. All 10,634 rows were
-- inserted in bulk (confirmed: identical-to-the-millisecond created_at
-- timestamps within each district's load), and src/components/ui/source-line.tsx's
-- own header comment independently confirms the underlying field_provenance
-- data is "a bulk-import snapshot (UDISE+/state education department data)
-- with zero verified_at values across all 61,895 open rows" -- i.e. this is
-- government/UDISE+ data, not anything a user typed into a form.
--
-- This is a data-hygiene fix, not a trust/safety one: confirmed (by reading
-- recordBadge, identityBand and SourceLine) that nothing user-facing reads
-- schools.source_type for its trust copy -- all three already read only
-- schools.verification (still correctly 'unverified' after this migration)
-- and independently say "compiled from public records, not yet confirmed by
-- the school." So the live site was never overclaiming verification; this
-- migration only corrects internal bookkeeping (ops tooling, future queries,
-- anyone -- including Claude -- reading source_type to understand where a
-- record came from) to say what's actually true: official bulk government
-- data, not a user submission.
--
-- 'official' is an existing value of public.provenance_source_type (the
-- other values are school_reported, schooloye_verified, user_submitted) and
-- is exactly the tier this data belongs to. verification is untouched --
-- 'unverified' remains accurate, since no individual record has been
-- confirmed against the school.
--
-- Scoped to source_type = 'user_submitted' specifically (not all rows), so
-- it's a no-op on any school that's legitimately user-submitted in the
-- future and doesn't touch the 36 rows already correctly tagged 'official'.

update public.schools
set source_type = 'official'
where source_type = 'user_submitted';
