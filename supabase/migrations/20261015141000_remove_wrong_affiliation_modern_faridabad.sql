-- Data fix (15 Oct 2026): school 74d1080e-5aa3-4ead-b632-91067812e995
-- ("Modern", Faridabad, published) carries CBSE affiliation 530012 from the
-- archived SARAS import, which belongs to a different school (flagged in the
-- 15 Oct project audit). A wrong board on a public page is worse than none, so
-- remove the row; the school stays published and re-qualifies for the board
-- badge only when a correct affiliation is sourced.
--
-- Claude writes this file and stops; a human runs
-- `pnpm db:migrate 20261015141000_remove_wrong_affiliation_modern_faridabad.sql --confirm`.
delete from public.school_affiliations
where id = 'c812a9e7-82db-49e6-8a7c-571abc3e5c47'
  and school_id = '74d1080e-5aa3-4ead-b632-91067812e995'
  and affiliation_no = '530012';
