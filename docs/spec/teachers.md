# Teachers — Developer Spec

**Status:** shipped (light profiles, affiliations, DM); hardening items draft · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** D-004, D-061, D-067, D-069, D-105, D-108, N-09, N-13, N-14, deferred table "Teacher as first-class entity / tutor marketplace", parked list (see `docs/decisions.md`) · **Guidelines:** `docs/guidelines/seo-geo.md`

## 1. Purpose and scope

D-004 keeps **light, claimable teacher profiles**. They are free, created by the teacher, and
listed only with the teacher's consent. Their job is to see whether teachers and parents use
them. That evidence is the trigger for any bigger teacher product (decisions.md deferred table).
Keep this light: no reputation, no marketplace.

**In scope:**
- the teachers directory;
- the teacher profile;
- create, manage and claim;
- school ↔ teacher affiliations (the school's public "Our teachers" roster);
- parent → teacher direct messaging (built);
- hardening of what's built.

**Out of scope (parked or deferred):**
- recommendations, awards/recognition, Teacher of the Week, intro video;
- tutor/activity discovery and leads (decisions.md "Test later");
- teacher as a first-class entity (see §7);
- educator social network (parked list).

## 2. Current state (verified against the repo on 27 Sep 2026)

**Schema**
- `supabase/migrations/20260925114317_teachers_schema.sql` creates `teachers`, `teacher_claims`,
  `teacher_experience`, `teacher_qualifications` and a private media bucket. The migration notes
  that recommendations, enquiries and awards were deliberately not created.
- `20260925121012_teachers_slug_column.sql` adds `slug`. `20260925121330_revoke_anon_teachers_raw_access.sql`
  revokes anon access to the raw tables.
- `20260926092821_teacher_direct_messaging.sql` creates `conversations` and `messages`, RLS'd to
  the two participants plus staff read, with an audit trigger on `messages`.
- `20260926095411_school_teacher_affiliations.sql` and `…101721_optimize…` create
  `school_teacher_affiliations`: status `pending_teacher | pending_school | active |
  declined_by_teacher | declined_by_school | removed`, mutual consent, 4 RLS policies, audited.

**Views**
- `db/views/080_public_teachers.sql` creates `api.public_teachers`,
  `api.public_teacher_experience` and `api.public_teacher_qualifications`.
- The gate is `status='published' AND is_listed`. Contract: `src/contracts/public-teachers.ts`.

**Routes and components** (screen map rows 12, 12b, 13)

| Route | Built |
|---|---|
| `/[locale]/teachers` | Directory, filter by subject (ISR). Not city-scoped: `listPublicTeachers` has no city filter |
| `/[locale]/teachers/create` | Self-service profile. `create/actions.ts` inserts `claimed_by = user`, **`status='published'`, `is_listed=true` immediately** |
| `/[locale]/teacher/[id]-[slug]` | Profile (claimed state), "Verified at" (active affiliations), message form. Indexable; in `sitemap-site.xml` |
| `/[locale]/teacher/[id]-[slug]/manage` | Edit, list/unlist, request to join a school, accept/decline invites (rate-limited) |
| `/[locale]/[city]/[entitySlug]/teachers` | School roster from active affiliations; `noindex` while empty |
| `/portal/team` | School invites a teacher or answers join requests |
| `/[locale]/my/messages`, `/my/messages/[conversationId]` | Parent inbox and thread; `checkRateLimit`: 10 new conversations per hour, 30 messages per hour |

Server modules: `src/lib/db/teachers.ts`, `src/lib/db/messages.ts`, `src/lib/db/school-team.ts`.
Components: `teacher-card.tsx`. Unused ported primitives: `recommendation-quote.tsx` and
`nomination-relationship-chips.tsx`, kept for the parked features.

**Not built or gaps:**
- **`teacher_claims` has no UI and no ops queue.** No staff-list ingestion exists, so there is
  nothing unclaimed to claim (per the migration header). It is written only by the data export.
- The unclaimed profile state (design 14c) is not built. Photo upload UI is not built, although
  the column and bucket exist.
- **The primary school is unverified but public.** `api.public_teachers` joins raw `schools` for
  `primary_school_name`/`slug`, so:
  - a teacher can name any school with no consent from that school;
  - the view can expose the name of a school that isn't published (it bypasses the
    `api.public_schools` gate).
- Messaging has no report/block control, no ops view of reported threads, and no teacher-side
  opt-out beyond unlisting.
- The `GRANT` sits inside `080_public_teachers.sql`; CLAUDE.md says grants go in migrations.
- `docs/page-enrichment-backlog.md` still lists "Teacher Request contact" as parked, although DM
  shipped on 26 Sep.

## 3. Requirements

### Teacher

1. **P0 — Create and publish (built).** Profile fields: name, subject, level (PRT/TGT/PGT),
   headline, about, years, open_to, locality, experience, qualifications.
   - Publishing is the teacher's own act, which is the consent.
   - Keep instant publish, since self-authored content is not extracted data (N-14 does not
     apply).
   - Add post-publish ops spot review (req. 7).
2. **P1 — School claims are two-tier.**
   - The self-declared primary school renders as "Says they teach at {school}" with no link
     unless the school is in `api.public_schools`.
   - Only an **active affiliation** renders as "Verified at {school}" (built).
   - Qualifications show "Verified" only when `verified_at` is set by staff.
3. **P1 — Photo upload** into the private bucket, served through a signed or transformed URL.
   The photo must be the teacher themselves (D-032 spirit). Staff can remove it.
4. **P1 — Unlist and delete.** Unlist is built. Deleting the account removes the profile,
   affiliations and conversations according to `docs/ops/data-retention.md`, through the existing
   `delete_my_account`.

### School

5. **P0 — Roster via mutual consent (built).** A school cannot edit a teacher's profile; it
   manages only the affiliation link. Either side can remove it. The roster page stays `noindex`
   while empty.

### Parent

6. **P0 — Direct messaging (built; stays live, D-105).**
   - A signed-in parent can message a published, listed, claimed teacher.
   - Report/block must ship before DM gets any further promotion (D-105): "Report conversation"
     (creates an `ops_tasks` row; staff read is already allowed by RLS) and "Block" (the teacher
     stops receiving from that user).
   - Show a line above the composer: "Don't share your child's documents or your phone number
     here. SchoolOye staff may review reported chats."
   - No child data fields in messages (D-067).
   - Teachers can turn off new conversations (`open_to` excludes `messages`).

### Ops

7. **P1 — `/ops/teachers`.**
   - New profiles in the last 7 days and reported conversations.
   - Actions: hide profile (`status='hidden'`), remove photo, verify qualification.
   - `teacher_claims` review appears here only when an unclaimed-profile source exists (§7).

### Directory

8. **P1 — Directory is city-scoped** by the selected city cookie through `locality_id → city`.
   - Filters: subject, level.
   - Order: alphabetical. Never by activity or payment (N-13).
   - Empty state: "No teachers have created profiles in {city} yet. Are you a teacher? Create
     your free profile."

## 4. Data

- **Tables:** `teachers`, `teacher_experience`, `teacher_qualifications`, `teacher_claims`,
  `school_teacher_affiliations`, `conversations`, `messages`, `profiles`.
- **Views:** `api.public_teachers`, `api.public_teacher_experience`,
  `api.public_teacher_qualifications`; `listPublicSchoolTeam` for the roster.
- **This repo:**
  - rebuild `api.public_teachers` to join `api.public_schools` instead of raw `schools`, and
    `api.public_localities` for the city;
  - move the `GRANT` into a migration;
  - add a `messages` report path as an `ops_tasks` insert (kind: reuse `verify_update` with
    `ref_table='conversations'`, or a new enum value through the data session).
- **Additive DDL** (data session, D-091):
  - `create table conversation_blocks (conversation_id uuid references conversations(id), blocked_by uuid references profiles(user_id), created_at timestamptz default now(), primary key (conversation_id, blocked_by));`
  - optionally, `task_type` value `moderate_message`.

## 5. Rules

- Consent: a teacher is listed only when they created and published their own profile. Nobody
  is listed from a scraped staff list.
- Trust: no ratings, votes, badges or awards (N-13, parked); "Verified at" only with mutual
  affiliation.
- Privacy:
  - messages are visible only to participants and staff (RLS built) and never enter public
    views (N-09);
  - teacher phone and email are never shown;
  - the data export (`my/account/export/route.ts`) includes `teachers` and `teacher_claims` but
    **not** `conversations`/`messages`; add them (DPDP access right).
- SEO: published teacher profile pages are indexable (D-108: D-053 applies only to listing/filter/landing pages) with `Person` JSON-LD. `worksFor` currently uses the
  unverified `primary_school_name`; change it to active affiliations only. Never add `employee`
  on school pages (D-045). Roster pages are `noindex` while empty. See
  `docs/guidelines/seo-geo.md`.

## 6. Acceptance criteria

- [ ] A teacher naming an unpublished school as primary shows no school name publicly (view
      test).
- [ ] "Verified at" lists only `active` affiliations.
- [ ] A parent can report a conversation. It appears in `/ops/teachers` and as an
      `ops_tasks` row.
- [ ] A blocked parent cannot send further messages (RLS test, rolled back).
- [ ] The directory shows only the selected city's teachers and never orders by anything but
      name.
- [ ] Unlisting removes the profile from the directory, sitemap and search within one
      revalidate.
- [ ] No recommendation, award or Teacher of the Week UI is reachable.
- [ ] `Person.worksFor` appears only for active affiliations; the data export includes the
      user's conversations and messages.

## 7. Deferred and open

- **Parked** (`docs/page-enrichment-backlog.md`, screen map "Post-launch"): recommendations,
  awards, Teacher of the Week, intro video. Not built unless Prav reopens them.
- **Teacher as first-class entity / tutor marketplace:** triggered by evidence from free
  teacher profiles. The proposed measurable form, for Prav to confirm:
  - ≥ 200 published Jaipur profiles;
  - ≥ 25% with an active school affiliation;
  - a sustained DM volume (e.g. ≥ 100 parent-initiated conversations a month) through the
    2027-28 season.

  Until then, no subjects taxonomy table, no tutor pricing, and no teacher search beyond the
  directory.
- **Unclaimed profiles and `teacher_claims` review:** only if schools' published teacher lists
  are ingested with the teacher's consent path decided.
- **Settled since 27 Sep (D-105):**
  - Product Spec v1.0 lists teacher profiles as N1 "Test later / P3", while D-004 keeps them and
    they're built. D-004 wins, and D-105 confirms: no new teacher features before 1 Nov.
  - DM shipped although the backlog marks "Request contact" as parked. D-105 confirms DM stays
    live, gated on report/block shipping before any further promotion of it.
