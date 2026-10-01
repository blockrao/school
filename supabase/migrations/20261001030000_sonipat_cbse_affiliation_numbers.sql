-- CBSE affiliation numbers for Sonipat schools, from the CBSE SARAS
-- affiliation directory itself (1 Oct 2026).
--
-- Context: 20260929140519 and 20261001020000 promoted board *type*
-- (CBSE/ICSE/State Board) from UDISE+'s board_sec/board_high_sec fields, but
-- deliberately left affiliation_no NULL — UDISE+ records board type, not a
-- CBSE affiliation *number*, and getting the number needs an actual CBSE
-- ingestion pass. This migration is that pass for Sonipat: Prav supplied the
-- CBSE SARAS "schools in Sonipat district" search result (176 rows: S.No,
-- affiliation number, CBSE school code, name, address, level), transcribed
-- from the live site rather than the web-archive mirror source 11
-- (saras_archive) uses, so this is filed under source_id 4 (saras) instead.
--
-- Matching method: for each of the 176 CBSE rows, first tried an exact join
-- on public.school_identifiers (scheme cbse_aff / cbse_saras_affiliation_no)
-- by affiliation number — 7 already matched that way and already carry a
-- complete, correct school_affiliations row (source 11, same affiliation
-- numbers), so there's nothing to do for those 7 here. For the remaining
-- 169, fuzzy-matched CBSE school name against public.schools in Sonipat
-- (district_id 21, merged_into is null) using pg_trgm similarity() on
-- upper(name_en) (normalize_school_name()/fuzzy_candidates_in_districts()
-- couldn't be used — the public.unaccent extension they depend on isn't
-- installed on this project, a pre-existing gap unrelated to this
-- migration, worth a separate look).
--
-- Every fuzzy candidate was reviewed by hand, not accepted on score alone:
-- a large fraction of the raw top-1 matches were the same handful of DB
-- rows (e.g. "H K Senior Secondary School", "Mann International School",
-- "D.s.s. Public School") reused as the nearest trigram neighbour for many
-- unrelated CBSE rows — a sign the true match isn't in the DB at all, not a
-- real hit. Any such row was accepted only once, for its single best-scoring
-- CBSE row, and only when that score was both high (>=0.75) and clearly
-- separated from the runner-up (>=0.15 gap); every other CBSE row pointing
-- at the same DB row was dropped rather than guessed. A few individually
-- high-scoring pairs were still dropped by hand where the names conflict on
-- a specific, load-bearing detail a trigram score doesn't weight highly
-- enough (e.g. "S.B. Global School" vs DB "B.r.global School" — different
-- initials; "Jain Vidya Mandir High School" vs DB "Bal Vidya Mandir High
-- School" — different founder name; "Dayanand Public School" vs DB
-- "Satyanand Public School"). This leaves 73 accepted matches out of 169;
-- the other 96 (mostly PM SHRI/Govt Model Sanskriti government schools and
-- other low-confidence rows) are left unmatched for a future pass rather
-- than guessed — many look like they may simply not be in the DB yet.
--
-- Of the 73 accepted matches, checking against existing school_affiliations
-- found three different starting states, handled as three separate
-- statements below:
--   1. INSERT (8 schools) — no school_affiliations row exists yet.
--   2. UPDATE, board already CBSE (57 schools) — the earlier UDISE-based
--      migrations already recorded board_id=1 (mostly with no affiliation_no
--      and no source_id at all, a handful already source_id=5/udise with
--      affiliation_no still null); this fills in the actual CBSE affiliation
--      number and attributes it to source 4. board_id and level are left as
--      they were — only ever filling a null affiliation_no, never
--      overwriting one, so this can't clobber a correct existing number.
--   3. UPDATE, board correction (7 schools) — these currently carry
--      board_id=3 (HBSE/State Board), set by the Haryana-wide UDISE
--      migration off UDISE's board_sec/board_high_sec field. The CBSE SARAS
--      directory is the authoritative source for CBSE affiliation and shows
--      these 7 are in fact CBSE-affiliated (each with a real affiliation
--      number), so this corrects board_id to 1 alongside filling in the
--      affiliation number.
-- One further school (DAV Police Public School, aff. 531506) was matched
-- but already has an identical, correct row from source 11 — nothing to do,
-- so it's simply not included in any of the three statements.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20261001030000_sonipat_cbse_affiliation_numbers.sql --confirm`.

-- 1. New school_affiliations rows for schools that don't have one yet.
insert into public.school_affiliations (school_id, board_id, affiliation_no, level, source_id)
select v.school_id::uuid, 1, v.affiliation_no, v.level, 4
from (values
  ('25cd0dc8-d5ce-4423-8bb1-94f59c26fb6e', '530667', 'senior_secondary'), -- SOFIA CONVENT SCHOOL -> Sofia Convent School
  ('ac7a85fc-7526-4ec2-be4d-1af907533eb2', '532032', 'senior_secondary'), -- SARASWATI SR. SEC. SCHOOL -> Saraswati Sr. Sec. School
  ('5203de57-e049-48ca-a743-1e9c9fc0be70', '530189', 'senior_secondary'), -- SHIVA SHIKSHA SADAN -> Shiva Shiksha Sadan
  ('4a50fd34-af6b-4d7e-bd9d-a73a45748dab', '531697', 'senior_secondary'), -- MANODEV INTERNATIONAL SCHOOL -> Manodev International School
  ('3b1589f8-2484-4064-bff8-fc4ec01d4d6d', '531202', 'senior_secondary'), -- SARASWATI SHIKSHA SANSTHAN HIGH SCHOOL -> Saraswati Shiksha Sansthan H School
  ('940ba6bc-e34c-4374-82f5-a497ca6bbfcf', '530462', 'senior_secondary'), -- SWAMI VIVEKANAND MODERN HIGH SCHOOL -> Swami Vivekanand High School
  ('1cf00af6-631c-4b4e-b8c5-e1e05e030b6f', '531822', 'senior_secondary'), -- HOLY CROSS SCHOOL -> Holy Cross Middle School
  ('f34858bf-2fb8-44a4-b1c0-67616705a05d', '530159', 'senior_secondary')  -- GITA VIDYA MANDIR -> Geeta Vidya Mandir
) as v(school_id, affiliation_no, level)
where not exists (
  select 1 from public.school_affiliations sa where sa.school_id = v.school_id::uuid
);

-- 2. Fill in affiliation_no (and attribute to source 4) for schools already
--    correctly marked as CBSE, where affiliation_no is still null.
update public.school_affiliations sa
set affiliation_no = v.affiliation_no,
    source_id = 4
from (values
  ('9e7fb96c-eadb-4f10-90e4-ceeef978c7da', '531197'), -- STANFORD INTERNATIONAL SCHOOL -> Stanford International School
  ('10deaef4-4cd4-42fd-a711-e2a3fb098805', '531070'), -- MANN INTERNATIONAL SCHOOL -> Mann International School
  ('92911971-febc-4620-8e51-81a876d5f7fd', '531123'), -- G.D. GOENKA INTERNATIONAL SCHOOL -> G D Goenka International School
  ('5dc2a04c-f276-4e3b-80fc-eae4ef974289', '530102'), -- NAVYUG PUBLIC SCHOOL -> Navyug Public School
  ('927c62ec-a62b-4e5b-894a-800b41aa55e8', '530469'), -- SOUTH POINT PUBLIC SCHOOL -> South Point Public School
  ('02e7ab62-1b91-47db-9031-f73fba6f2d55', '531323'), -- LORD KRISHNA PUBLIC SCHOOL -> Lord Krishna Public School
  ('730dacf2-f661-42e2-840d-a21edcdb4630', '530442'), -- TAKSHILA PUBLIC SCHOOL -> Takshila Public School
  ('2931c551-01c8-4aa4-b275-f3a81b04fe6b', '530425'), -- SHER SINGH PUBLIC SCHOOL -> Sher Singh Public School
  ('5441e188-7d74-49b2-9c23-09168ba6a6f3', '530376'), -- J K R PUBLIC SCHOOL -> J K R Public School
  ('b10a6ca3-444c-4ff8-a2fc-7a8b49d1881d', '530100'), -- JANKIDAS KAPUR PUBLIC SCHOOL -> Jankidas Kapur Public School
  ('226b5efe-9cea-40b4-84ea-25a9aae65522', '530078'), -- MALVIYA SHIKSHA SADAN -> Malviya Shiksha Sadan
  ('d49d4aac-c0e8-4b5c-9623-5327fa4636bc', '530065'), -- SHAMBHU DAYAL MODERN SCHOOL -> Shambhu Dayal Modern School
  ('8b03af6b-3985-49a3-9686-61ee02bec1a0', '530017'), -- RAUNAQ PUBLIC SCHOOL -> Raunaq Public School
  ('dbbc8aff-53ee-4f8a-9099-ab82acd14589', '531399'), -- SWASTIK CONVENT SCHOOL -> Swastik Convent School
  ('6d204a7b-0cac-4743-b8e3-c3786530d52d', '531446'), -- GOLDEN HARRIER SCHOOL -> Golden Harrier School
  ('1fdffec0-dd68-4a73-9fa8-607135dde4a4', '531451'), -- PURAN MURTI GLOBAL SCHOOL -> Puran Murti Global School
  ('aee6e7a3-86af-4ddd-b621-4536a05cfad4', '531276'), -- RUKMINI DEVI PUBLIC SCHOOL -> Rukmini Devi Public School
  ('72239ac9-2269-4604-86df-db0d08957273', '531512'), -- MODERN CONVENT SCHOOL -> Modern Convent School
  ('92df06ad-fec1-43f6-9e19-f7c0c7cd6264', '531248'), -- ISHWAR INTERNATIONAL SCHOOL -> Ishwar International School
  ('79ff53e0-9c56-40f8-8afa-74748c0dbfc8', '531186'), -- GYAN GANGA GLOBAL SCHOOL -> Gyan Ganga Global School
  ('28e13eec-b0af-47bd-b650-4e4d06e487be', '531170'), -- J.S. INTERNATIONAL PUBLIC SCHOOL, -> J.s International Public School
  ('c4646c7f-2a34-4f62-8cbc-6428efbab746', '531085'), -- KIRORIMAL PUBLIC SCHOOL -> Kirorimal Public School
  ('9800338a-2b80-4bd2-b7dc-f502f2050ab1', '531751'), -- BIRLA CHILDREN ACADEMY -> Birla Children Academy
  ('062620f9-77ce-4526-bcb9-ddd56c7f0dce', '531004'), -- GLOBAL PUBLIC SCHOOL -> Global Public School
  ('46801b07-e019-4868-a696-764a00cdd480', '530882'), -- SHASWAT CHETNA SR. SEC. SCHOOL -> Shaswat Chetna Sr. Sec. School
  ('980c804a-3694-4558-9cde-651478329074', '530803'), -- SHAMBHU DAYAL SHIKSHA SADAN -> Shambhu Dayal Shiksha Sadan
  ('77ad2c46-5283-4d07-b61e-e584ed52a75d', '531846'), -- GOLDEN PETAL PUBLIC SCHOOL -> Golden Petal Public School
  ('1ccbdc6c-8de1-4aa3-91b0-5ca9cb073866', '530740'), -- INDIAN MODERN SR SEC SCHOOL -> Indian Modern Sr. Sec. School
  ('585fb316-ecd5-4b9d-aebb-968a62ebdc9d', '530726'), -- HOLY FAMILY CONVENT SCHOOL -> Holy Family Convent School
  ('86f46d8b-76ed-48a8-9c88-d8a407787ab6', '530619'), -- GATEWAY INTERNATIONAL SCHOOL -> Gateway International School
  ('00933655-e01a-478c-928f-32dea3462632', '530110'), -- DAV MULTI PURPOSE PUBLIC SCHOOL -> DAV Multipurpose Public School, .
  ('1e15baea-0525-4ed4-a4fe-47e1951b20b2', '532315'), -- SM HINDU SR. SEC. SCHOOL -> Hindu Sr. Sec. School
  ('596f8a0f-6525-4bae-811e-04077959d1a6', '530528'), -- APOLLO INTERNATIONAL SCHOOL -> Apolo International School
  ('b2460add-503b-4ef3-8ae6-e695a54e7c61', '531615'), -- SIR CHHOTU RAM SR. SEC. SCHOOL -> Sir Chhotu Ram Sr.sec.schoo
  ('71663dd4-cad5-4cf5-a518-6c93ac2712a4', '530168'), -- LITTLE ANGELS SCHOOL -> Little Angel School
  ('05216b43-c793-4f86-a664-e081c3dec243', '531060'), -- THE GOLDEN ERA PUBLIC SCHOOL -> Golden Era Public School
  ('4df02272-999e-4be2-a207-ece4e0a2bbc2', '530998'), -- SANSKAR VIDYA PEETH SR.SEC. SCHOOL -> Sanskar Vidyapeeth Sr.sec.School
  ('6f097e51-6289-40a4-9e5a-e1db65f80df3', '531196'), -- LANDMARK INTERNATIONAL SCHOOL -> Land Mark International School
  ('dfb17f91-a2da-4ea3-aae8-c5fa93f38f66', '530768'), -- KALPANA CHAWLA VIDYAPEETH -> Kalpana Chawla Vidya Peeth
  ('3fdc082c-4218-407b-8d29-8d05ced6eb38', '530795'), -- MAM CHAND PUBLIC SCHOOL -> Mamchand Public School
  ('8fd31e4e-3f92-4cf3-9e52-fdd3c43745ec', '531288'), -- SHREEJEE INTERNATIONAL SCHOOL -> Shreejee International School Sonipat
  ('7ec53b28-36d8-4369-983b-88a69a9707dd', '530576'), -- BAL BHARTI VIDYA PEETH -> Bal Bharti Vidyapeeth
  ('a6f97436-52ca-4efb-8bcb-5590aa4e51ee', '531599'), -- ST. JUDES ACADEMY -> St. Jude's Academy
  ('0126aa78-1f14-4f19-bb61-df99944083ff', '530375'), -- A. P.GARG PUBLIC SCHOOL -> A.p.g. Public School
  ('01b6491e-badc-45d0-9434-67b8b8a4b7e8', '530156'), -- RISHIKUL VIDYAPEETH -> Rishikul Vidya Peeth
  ('cb8e07b0-3d25-4145-b7e3-e94fdf4dbc28', '580011'), -- ITBP PUBLIC SCHOOL -> ITBP Public School Saboli
  ('c27d8912-28cf-49c0-9325-db7248ed7222', '530007'), -- HOLY CHILD SEC SCHOOL -> Holi Child Sr. Sec. School
  ('7acc3da6-e22b-43e7-b81c-415d3d3545b9', '531357'), -- UNIQUE PUBLIC SCHOOL -> Unique Public School Pugthala
  ('0c788dcf-42b6-4aa6-850c-8ee943bfa7dd', '531148'), -- DELHI VIDYAPEETH -> Delhi Vidya Peeth
  ('78d44d6e-756a-4522-934d-b73fd07a19ee', '530041'), -- HINDU VIDYAPEETH -> Hindu Vidya Peeth
  ('b093d879-6309-4db7-9255-5d35a3bc5c1e', '531596'), -- RISHIKUL WORLD ACADEMY -> Rishikul World Academy Sonepat
  ('d7b4a713-6cbe-4fae-9e48-d247c1fe9a7d', '530706'), -- SUNRISE INTERNATIONAL SCHOOL -> Sunrise International School, Nangal Kalan
  ('4cdfd003-9a92-4aed-ba83-5180c52df77d', '530977'), -- AMAR SHIKSHA SADAN SR. SEC SCHOOL -> Amar Shiksha Sadan Sr. Sec. Sersa
  ('bb8a8d4e-ec40-4462-95af-689a0f03b889', '531108'), -- NALANDA INTERNATIONAL SCHOOL -> Nalanda Internationa
  ('2dd27b90-7907-4751-aa2d-ab606c7a0e6e', '530735'), -- SIR CHHOTU RAM MODERN SENIOR SECONDARY SCHOOL -> Sir Chhotu Ram Modern School
  ('8feb8f35-86c3-4043-a7e0-ac59e3bfb6aa', '531723'), -- THE SPRING ERA PUBLIC SCHOOL -> The Spring Era Public School Ganaur Sonipat
  ('a13c99f0-c320-4f69-9819-322c866c18a5', '530709')  -- MAA SARASWATI PUBLIC SCHOOL, DAHISARA, SONEPAT -> Maa Saraswati Public School
) as v(school_id, affiliation_no)
where sa.school_id = v.school_id::uuid
  and sa.board_id = 1
  and sa.affiliation_no is null;

-- 3. Correct board_id from HBSE (State Board, set by the UDISE-based
--    migration) to CBSE, and fill in the affiliation number, for schools
--    the CBSE SARAS directory shows are actually CBSE-affiliated.
update public.school_affiliations sa
set board_id = 1,
    affiliation_no = v.affiliation_no,
    level = v.level,
    source_id = 4
from (values
  ('201b4723-5ce5-4c9b-9eea-ba37335ae326', '530614', 'senior_secondary'), -- SWAMI VIVEKANAND PUBLIC SCHOOL -> Swami Vivekanand Public School
  ('90b0ddd6-09c7-4ba6-bd14-770e370fdbad', '531931', 'senior_secondary'), -- JANTA SHIKSHA SADAN -> Janta Shiksha Sadan, Janti
  ('5829316f-e938-4d7f-8507-22cbe422e8d6', '530446', 'senior_secondary'), -- JAI BHARAT MODERN SCHOOL -> Bharat Modern School
  ('163ad86e-f92f-4906-ab9d-872d4520f4c5', '530808', 'senior_secondary'), -- GIAN BHARTI PUBLIC HIGH SCHOOL -> Gyan Bharti Public High School
  ('546fa893-ad7f-4667-8705-a0d2112d1440', '530514', 'senior_secondary'), -- HAPPY CHILD HIGH SCHOOL -> Happy Child High School Ganaur
  ('586dac16-8b66-478d-af18-40f888b6c896', '530848', 'senior_secondary'), -- GYAN DEEP SR. SECONDARY SCHOOL, -> Gyan Deep Sr. Sec. School
  ('4433c699-72fd-4433-8111-3a90e790db67', '532096', 'senior_secondary')  -- SHRI RAM KRISHAN SR SEC SCHOOL -> Shri Ram Krishan Sr. Sec. School, Bhigan (Sonepat)
) as v(school_id, affiliation_no, level)
where sa.school_id = v.school_id::uuid
  and sa.board_id = 3;
