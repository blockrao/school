# School claim + school portal — Developer Spec

**Status:** §2 shipped (claim v1, portal v1) · §3 claim v2 / fees / widget draft · featured placements draft · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** N-05, N-06, N-13, N-14, D-003, D-011, D-013, D-014, D-024, D-025, D-032, D-052, D-060, D-061, D-062, D-063, D-065, D-066, D-067, D-069, D-072, D-073, D-084, D-085, D-087, D-089, D-091, D-100, D-103, D-107 (see `docs/decisions.md`) · **Guidelines:** `docs/guidelines/seo-geo.md`, `docs/guidelines/content-and-trust.md`, `docs/guidelines/design.md`
**Related specs:** `openseat.md` (seat status), `data-and-trust.md` (labels, precedence), `school-entity-page.md` §5.3 (parent fee reports), §8 (portal fee actions), §10.2 (moderation), `ops-console.md` (claims/call queues)

## 1. Purpose and scope

This is the supply side. A school finds its page (which SchoolOye built from public records), proves that someone there works for the school, and then keeps its own admissions, contacts and notices up to date. Parents see a fresher, school-verified record. Claiming is free, is reviewed by staff, and never changes where a school appears in search (D-060). Ownership, verification and authorship are three separate things: approving a claim changes nothing about how facts are labelled (N-05).

**In scope**
- `/for-schools` landing page, and the claim flow: v1 (live) and v2 (ships 1 Nov, D-085). v2 adds domain-email OTP, registry-contact OTP, letterhead + callback, and magic claim links sent after ops calls.
- `school_members` roles (admin/staff) and member management.
- "Review your record" first-run checklist.
- Portal editing under the D-084 publish rules, an admissions editor, and AI prefill from an uploaded notice.
- Admission notices, plus news & PR posts (`school_posts`).
- Fee verification actions on parent fee reports: verify / correct / respond / dispute (D-013).
- Enquiries inbox.
- Seat updates (entry point only; the rules live in `openseat.md`).
- Website widget + badge at `/embed/school/[code]` (D-063).
- Featured placements, bought from the portal (D-089, from 1 Dec).
- What schools can never hide (D-062).

**Out of scope**
- Portal Insights/analytics (H6). Deferred: "School insights" waits for "enough real traffic that numbers aren't made up".
- Enquiry/lead packages (I3, P2) and the school subscription (I6, P3) (D-011 order).
- Parent fee-report *intake* and the redaction pipeline. That is `school-entity-page.md` §5.3; only the school-side actions are here (entity spec §8).
- Parent reviews (post-season, D-009).
- ERP and school communication suites (parked).
- Teacher affiliations (`/portal/team` today). The teacher profile spec covers them.

## 2. Current state (verified against the repo on 27 Sep 2026)

**Public / claim (non-locale routes, allowed by `src/proxy.ts` `NON_LOCALE_PREFIXES`)**
- `src/app/for-schools/page.tsx`: static landing page. Four "how it works" steps; "Claiming never changes where your school appears in search"; "Featured placement is a separate, clearly-labelled paid option". It has **no locale** and no hreflang, and its step 4 still says "request profile edits", which predates D-084.
- `src/app/for-schools/claim/page.tsx`: name search inside the selected city (`listPublicSchoolsByDistrict` from `src/lib/db/public-adapter.ts`). `noindex`.
- `src/app/for-schools/claim/[schoolId]/page.tsx` + `actions.ts` (`submitClaim`): three methods, `official_email`, `phone_on_record` and `document`. **There is no OTP.** The claimant types the full email or phone. The server compares it with the legacy `schools.email[]` / `phone[]` arrays and stores `{claimed_value, matched}` in `school_claims.evidence`. A letter goes to the private `school-claims` bucket at `{user_id}/{uuid}/letter.ext`. Every claim becomes `status='pending'`. There is no dedupe: one user can file repeated pending claims for the same school.
- `.../pending/page.tsx`: "usually within a working day".
- School page claim CTA: `src/app/[locale]/[city]/[entitySlug]/page.tsx:520` shows "Is this your school? Claim it free" when `claim !== 'claimed'`.

**Ops**
- `src/app/ops/claims/page.tsx` + `actions.ts`: `approveClaim` sets `school_claims.status='claimed'`, inserts `school_members(role='admin')` and sets `schools.claim='claimed'`. By design it leaves `source_type`/`verification_status` untouched (N-05). It **ignores every write error**. `rejectClaim` exists.
- `/ops/notices`, `/ops/seats` (sets `seat_status.confirmed_at`), `/ops/posts` (approve/reject `school_posts`) and `/ops/corrections` also exist.

**Portal (`src/app/portal/**`, `noindex`, disallowed in `src/app/robots.ts`)**
- `page.tsx`: dashboard with a seat-status grid (`updateSeatStatus` in `actions.ts` inserts one `seat_status` row per class, `confidence='reported'`, `reported_via='school_portal'`, no error checks), the last 10 enquiries, and notice status. Its header comment says Insights, the featured upsell and completeness were left out on purpose.
- `edit-request/`: inserts into `correction_requests` (the table is slated to merge into `update_reports`, per the entity spec §6.4).
- `notices/new/`: the school pastes a **URL** and fills in the fields by hand. The row goes into `admission_notices` with `review='pending'`. There is no upload and no AI prefill.
- `news/`, `news/new/`: `school_posts` (news | press), which ops reviews. There is **no public consumer** yet.
- `team/`: this is **teacher affiliations** (`school_teacher_affiliations`), not `school_members`. There is no UI to invite or manage school staff members.
- Server modules: `src/lib/db/portal-auth.ts` (`requireSchoolMember`, `requireSchoolAdmin`; the latter is unused and neither handles more than one school, since both take the first membership); `src/lib/db/portal.ts`; `src/lib/db/school-team.ts`. Portal actions call `getMySchoolId()` and do not check the member's role.

**Migrations**
- `20260925111432_schools_flow_policies.sql`: member insert/select on `admission_notices` (pending only); member insert/update on unconfirmed `seat_status`; member insert on `correction_requests`.
- `20260925111443_school_claims_storage_bucket.sql`: `school-claims` bucket, owner and staff read.
- `20260925111506_schools_flow_grants.sql`, `20260925111955_enquiries_select_grant.sql`.
- `20260925111631_narrow_school_claims_grants.sql`: **REVOKE ALL** on `school_claims`, `school_members` from `authenticated`, then grants only select/insert and select. Ops staff sign in as `authenticated`. **If this migration has been applied, `approveClaim`'s UPDATE and INSERT fail at the grant level, and the failure is silent.** The same applies to `members_school_admin_manage_others/remove_others` in `20260926070059_...`, which cannot take effect without update/delete grants. This is P0: check `schema_migrations`, then grant update on `school_claims` and insert/update/delete on `school_members` to `authenticated`. RLS already restricts those writes to staff and school admins.
- `20260926070059_school_member_roles_audit_and_rate_limits.sql`: `school_member_role` enum, `is_school_admin()`, audit triggers, `check_rate_limit()`.
- `20260926092026_school_posts_news_and_pr.sql`.

**Tables that exist:** `school_claims`, `school_members`, `school_posts`, `enquiries` (has `child_id` and `billable`), `featured_placements` (`label CHECK = 'Sponsored'`, `city_id`, `class_codes`, `placement`, `starts_on/ends_on`, `order_ref`; RLS public read inside the date window), `seat_status`, `update_reports`, `fee_items`, `correction_requests`, `admission_notices`.
**Not present:** `fee_reports`, `fee_responses`, `school_documents`, claim invites, OTP challenges, widget events, `/embed`, portal fee screens, and the admissions editor.

**Raw-table reads:** portal and ops read raw tables through the RLS-scoped session client (`src/lib/db/portal.ts`). This is allowed for `/portal` under D-103 (authenticated, noindex owner/staff pages, amending N-10), provided each such module lists its tables at the top. Existing code stays as it is. New portal *reads* of anything that carries a publish rule go through `api.portal_*` views (§4).

`docs/screen-map.md` row 11 marks the School Portal "designed+built". It is accurate for claim v1, the dashboard, notices, edit requests and news. It is not accurate for anything in §3 below. `docs/design-gaps.md` has no portal rows. The only design source is `design/School Portal.dc.html` (18a–c + notice).

**Addendum, 29 Sep 2026 — Events and Jobs now exist, undocumented above.** `/portal/events/`, `/portal/events/new/`, `/portal/events/[id]/` and the mirrored `/portal/jobs/` tree were built in the same 29 Sep "Activity & Admissions Consolidation" work that added `school_events`/`school_jobs`, after this section was last verified against the repo. Same shape as `/portal/notices/new/` and `/portal/news/new/`: a form action gated only by `getMySchoolId()` (membership, no role check), writing into `school_events`/`school_jobs`. Both tables carry the same `review`/`listing_review`/edit-lock-trigger mechanism as `school_posts` (`school_*_enforce_edit_lock`, documented today only in the migration and `db/views` file headers, not in this spec). Neither screen is reflected in `docs/screen-map.md` row 11 yet.

## 3. Requirements

### School: landing and claim
1. **P0** `/for-schools` keeps two lines: "Claiming is free" and "It never affects where your school appears in search" (D-060). Step 4 copy changes to: "Update admissions, contacts and notices. Most changes go live straight away." The page moves to `/[locale]/for-schools`, with the old path redirected by 308, and gets canonical + hreflang.
2. **P0** Claim v1 stays live until v2 ships (D-085). Fixes before 15 Oct: check write errors in `approveClaim`; the grant fix from §2; one open claim per user × school (a second submit shows the existing pending state); when a claim is approved, the school's other pending claims are marked `rejected` with a reason.
3. **P1 (1 Nov)** Claim v2 method picker, fastest method first. Each method shows the masked contact **from public record only**. Copy: "We only use contact details already on public record for this school, so nobody can claim it with a personal number."
   - **Domain email OTP**: a 6-digit code goes to an address on the verified `school_links.website` domain. The claimant types the local part; the domain is fixed.
   - **Registry contact OTP**: a code goes to the email or phone on the board record (SARAS/CISCE), or to an ops-verified landline. Landlines get the code by voice call ("Call me with a code").
   - **Letterhead + callback**: upload a signed letter (PDF/JPG/PNG). Ops calls the officially listed landline. Copy: "Takes 2–3 working days to check. Until then, parents keep seeing the page as unclaimed. Nothing on it changes."
   - OTP screen: six digit boxes with `autocomplete="one-time-code"`. Resend is locked for 30 s. Send and verify are rate-limited through `check_rate_limit` (5 sends per hour per school; 5 wrong codes lock that challenge). Codes expire after 10 min and are stored hashed.
4. **P1** A successful OTP gives **provisional** access. The school can draft edits and see the portal, and a banner says "Your claim is being confirmed (within 1 working day). Changes you make are saved as drafts." **Nothing publishes** until ops approves the claim (D-060 requires staff review). Approval sets `schools.claim='claimed'` and gives the first member `role='admin'`.
5. **P1 Magic claim links** (D-065). The ops call screen ends with "Who should approve your record?". Ops enters the contact's name and WhatsApp number or email, and the system sends a single-use link bound to school × contact, valid for 7 days. Opening it goes through phone sign-in, then straight to provisional access. The link counts as registry-contact proof because ops dialled an on-record number. Links are audit-logged, one active link per school.
6. **P1** Rejection copy tells the claimant which method to try next. It never reveals which on-record contact failed to match.

### School: first run and editing
7. **P1** Right after approval, "Your page is claimed" shows the **Review your record** checklist. It is visible to the school only. Items: confirm core facts · add admission dates for the session being admitted · upload fee circular · respond to parent fee reports · add the widget to your website (D-063) · link your Google Business Profile. Progress shows as "N of 6 done". Nothing is a percentage made from empty columns.
8. **P1** Each field row shows its current value, its source label (D-024), its checked date, and three actions: **Confirm · Edit · Doesn't apply**.
   - Confirm writes a `field_provenance` row (`source_type='school_reported'`, `verification_status='verified'`, via the school portal) and bumps the checked date. The public label becomes "Verified by school".
   - Doesn't apply records an explicit N/A. It is never a blank.
9. **P1 Publish rules (D-084)**, applied only for an approved **admin**. Staff and provisional users always go through review.

| Edit | Publishes |
|---|---|
| Current-session admission dates, status, form link; contacts; hours; "about" | Immediately. Alerts fire. Row goes into the ops audit queue, cleared within 24 h |
| Deadline moved earlier, cycle cancelled, name, board, affiliation | After ops review; a notice or document upload is required |
| Fees | Only through the fee actions in req. 13 |
| Anything else (class range, facilities, photos) | After ops review (D-100; see §7 "Settled since 27 Sep") |

   If ops rejects an immediately published edit during the audit, the previous value comes back, the change log records the reversal, and the school gets a reason.
10. **P1 Admissions editor**: a session × class grid, plus a "Apply the same dates to Nursery–UKG" bulk action. **Upload notice PDF** stores the file in the private bucket. The existing `admission_notices` AI extraction fills the fields, and each one shows "Found on page N of the PDF" until the school edits it ("Changed by you"). The school has to confirm every field; AI output alone never publishes (N-14, D-025). Validation: the last date cannot be before the open date ("The last date is before forms open. Check both dates against the PDF."). Live preview copy: "On {date} (7 days before closing) the margin turns red for parents automatically" (D-050).
11. **P1 Notices**: submitting a notice creates an Updates entry with its own URL. When the notice publishes, a WhatsApp alert goes to followers of that school and class (D-064). The opt-in checkbox shows the follower count only when the count is real. Its publish path follows req. 9: an admin's current-session notice publishes immediately; everything else goes to review.
12. **P1 News & PR** (`school_posts`): ops review stays as it is. The public consumer (Updates on the school page) comes through `api.public_school_updates`. Nothing extracted or school-written is labelled "Official".

### School: fees, enquiries, seats, widget, featured
13. **P1 Fee actions (D-013)**, per fee head or per class, on redacted parent reports. The school never sees reporter identity or child data (D-067).
    - **Verify**: the school's figure becomes the displayed value, labelled "✓ Verified by school". Parent reports stay as history.
    - **Correct**: requires a fee-circular upload. If accepted, evidence-backed parent reports differ by more than 10%, ops reviews before publishing.
    - **Respond**: a public note of at most 280 characters under the fee block.
    - **Dispute**: sends the report to ops moderation. The school has **no delete or hide action** (D-062).
14. **P1 Enquiries inbox**: filter by class and session; mark read or replied. Shows class, message and date only. The parent's phone appears only if the parent chose to share it (copy: "Parents' phone numbers are shared only when they choose to."). Child data is never shown. Empty state: "No enquiries yet. Parents can ask from your school page."
15. **P1 Seats**: the grid stays on the dashboard, and all seat rules are in `openseat.md`. A verified admin's seat update now publishes immediately, labelled "Reported by school · {date}" (D-107), with an ops audit (D-100, extending D-084); staff updates still go through review. Portal copy must include all four mappings: Open → "Seats available", Limited → "Few seats", Waitlist → "Waitlist", Closed → "Full". Today's copy leaves out Waitlist. Staff members may update seats.
16. **P1 Widget & badge (D-063)** at `/embed/school/[code]?class=&theme=`. It is server-rendered, about 5 KB, sets no cookies, sends `X-Robots-Tag: noindex`, and sends `frame-ancestors *` on this route only. It shows the current-session status for up to 3 classes, the next date, the form link, and "Official record on SchoolOye →" (the latter only for a claimed, school-verified page; otherwise "Admissions info on SchoolOye →", per D-052). There are three embed forms: iframe; a script that also writes a plain crawlable `<a href="{canonical}">`; a static badge. The portal "Widget & links" page has copy buttons, a preview and a "Check my website" button, which fetches the school's site once and looks for the canonical link. Impressions and clicks go to `events` with no personal data.
17. **P1 (from 1 Dec) Featured placements (D-089)**: the portal "Upgrade" card and its plans page carry a visible "Sponsored" tag and say: "Shown on Jaipur city and list pages for the classes you choose, always labelled 'Sponsored'. It never changes your verification, freshness checks or labels." Purchase goes through Razorpay (I4). Ops then creates the `featured_placements` row. Rendering rules are in §5.

### Ops
18. **P0** `/ops/claims` shows each claim's method, whether it matched, a signed URL for the letter (staff-only bucket read), and the school's on-record contacts. Approve and reject both require a reason.
19. **P1** A new "Portal audit" queue lists every D-084 immediate edit with a 24 h SLA (accept / revert). The fee dispute queue lives in `/ops/moderation` (`school-entity-page.md` §10.2).

### Parent (visible effects)
20. **P0** An unclaimed page reads "Compiled by SchoolOye from public records", with no logo and no "Official" (D-052). A claimed page changes labels **per fact** only as facts get verified.

### School admin self-serve scope — refined 29 Sep 2026

Reconciles the requested blanket framing — *"events, admissions, jobs and news can be managed directly by school admin; all main info on the school page only changes after ops verification; ops is super-admin over everything; school admin can add teachers to the page"* — against what's actually built and against the existing, more granular D-084 rules (req. 9 above). Four sub-areas, each a different distance from done; none of this is decided unilaterally below where it conflicts with an existing approved decision — those points are flagged for you to call, not silently resolved.

**Events, News, Jobs — mostly already true; two fixes, not a rebuild**

21. **Confirmed, not a new build.** A school member already creates and edits their own school's events, news posts and job postings directly from `/portal/events`, `/portal/news`, `/portal/jobs` — no ops step to get a draft live. Ops review only gates the extra site-wide placement (`/events`, `/news`, `/jobs`); the school's own page shows the item immediately, edit-locked while `listing_review='pending'` and auto-demoted from `'approved'` to `'edited'` on any change to an already-listed item. This already satisfies "managed directly by school admin" for these three — the meaning here is "live on the school's own page at once, reviewed only for the extra site-wide listing," not "gated behind ops."
22. **P0 — gap: no admin/staff split is enforced.** `getMySchoolId()` is the only check on every portal write (events, news, jobs, notices, seats). `requireSchoolAdmin()` exists (`src/lib/db/portal-auth.ts`) but nothing calls it — today a `staff`-role member can do everything an `admin` can on all four flows. Recommend closing this by *documenting* the existing D-061 carve-out as deliberate rather than building new gates: D-061 already says "staff handle seats, notice drafts and the enquiry inbox" — extend that explicitly to events/news/jobs, and reserve admin-only for membership and fee actions (already true). The alternative (admin-only for all four) needs new role checks in every action file; flagged as the open question it is in §7.
23. **P1 — documentation debt.** Add `/portal/events` and `/portal/jobs` to `docs/screen-map.md` row 11 and to this spec's §2/§3, and give the `school_events`/`school_jobs` edit-lock mechanism its own paragraph here — today it exists only in migration/view-file comments.

**Admissions — the one real gap; needs new write access and new UI**

24. **P0 — `admission_cycles` has zero school-member write access today.** RLS is `cycles_public_read` (published/staff/member may read) plus `cycles_staff_write` (staff-only write) — a school admin can see their own cycles but cannot create or edit one. Every cycle so far, including the Nursery cycle inserted as test data this session, was written directly by staff. This is the concrete gap behind "admissions... managed directly by school admin" — nothing today does that.
25. **P0 — reconcile two separate admissions data models before building the editor.** `admission_cycles` (baseline schema; structured `academic_year`/`class_code`/`status`/`opens_on`/`closes_on`/`form_url`/fee/eligibility; D-119: every cycle of a published school shown exactly as stored, no review gate; feeds `/admissions`, the school page's own admissions section, and admission-leads capture) is a *different table* from `admission_notices` (this spec's existing req. 10: PDF-upload + AI-extraction + ops-`review` pipeline; its "admissions editor" UI was never built, and the table has no public reader today). These came from two separate pieces of work and were never reconciled against each other. Recommend the portal write to `admission_cycles` — it's the table actually live on `/admissions` and the school page — and redefine req. 10's "admissions editor" as the UI for creating/editing `admission_cycles` rows, with notice-PDF upload kept as an optional AI-prefill convenience on top of the same form rather than a separate pipeline. This changes what req. 10 means; flagging rather than deciding it silently.
26. New RLS policy, `cycles_school_member_write`: a member of `school_id` may insert/update that school's own `admission_cycles` rows. Same admin-vs-staff question as req. 22 applies; recommend **admin-only** here specifically — a wrong closing date has real applicant impact, unlike a staff-postable event. Publishes immediately, no listing_review gate (matches D-119, which already treats every stored cycle as shown-as-is); ops keeps a post-hoc audit, same 24h-queue shape as D-084's immediate-publish rows in req. 9, rather than a pre-publish review.
27. New portal UI at `/portal/admissions`: one form per academic_year × class_code (the grid concept from req. 10 still applies), covering status/dates/fee/form_url/eligibility fields, validated the same way as req. 10 (closing date ≥ opening date). Bulk "apply to Nursery–UKG" and PDF AI-prefill stay out of scope for this pass — land plain CRUD first.

**Core school-detail-page info — reconcile with D-084, don't replace it**

28. The request ("main info only changes after ops verification") is coarser than the already-approved D-084 table in req. 9: some core fields (current-session admission dates/status/form link, contacts, hours, "about") already publish immediately with a 24h post-hoc ops audit, not a pre-publish gate; only the rest (name, board, affiliation, class range, facilities, photos, deadline-earlier, cycle-cancelled) require review before going live. Recommend keeping D-084 exactly as it is rather than moving everything behind pre-publish review — the immediate-publish fields are the ones schools update most often, are low-risk, are audited within a day, and gating them would make the portal noticeably slower for no real trust gain. Flagged rather than silently kept or silently overridden — this needs your call.

**Ops as super-admin — mostly already true; one standing requirement**

29. **Mostly already true.** `is_staff()` already bypasses every edit-lock trigger and every school-scoped RLS policy across events/news/jobs/notices/seats/claims/members, and `/ops/*` already has a console for claims, notices, posts, events, jobs, seats, corrections, staff and audit. `admission_cycles` staff write is likewise already covered (`cycles_staff_write`), and req. 26's new school-member policy doesn't remove it. **New standing requirement: every table this spec (or a future one) adds for school-portal content ships with an `is_staff()`-bypass write policy from day one** — the same pattern `cycles_staff_write`, the edit-lock triggers' staff carve-out, and D-084's `portal_publish_edit()` already follow — so ops's total override stays true by design, not by accident, as the schema grows.

**Teachers — the request as stated conflicts with an existing, deliberate rule**

30. **Conflict, not a gap — needs a decision, not a build.** `docs/spec/teachers.md` D-004 already ships and is explicit: "a teacher is listed only when they created and published their own profile. Nobody is listed from a scraped staff list." A school admin authoring a teacher profile on the school's behalf is exactly what D-004 rules out, deliberately, as a consent decision. What school admins can already do, today, at `/portal/team`, is invite an existing teacher's profile onto the school's roster, or accept a teacher's request to join, through `school_teacher_affiliations` mutual consent — that is "adding a teacher to the school's page," just consent-gated on the teacher's side. If "adding" means something narrower — the school pre-creating an unclaimed placeholder a teacher can later claim — that's `teacher_claims`, which `docs/spec/teachers.md` §2/§7 already flags as unbuilt, with no ingestion path and an explicitly deferred consent question ("only if schools' published teacher lists are ingested with the teacher's consent path decided"). Recommend keeping D-004 as is unless you want to reopen it — reopening D-004 is a product-policy call for you, not something to route around at the requirements layer.

## 4. Data

**Existing, used as is:** `school_claims` (`method text`, `evidence jsonb`, `status claim_status`), `school_members` (`role school_member_role`), `school_posts`, `admission_notices` (`storage_path`, `ai_extraction`, `review`), `seat_status`, `enquiries`, `featured_placements`, `update_reports`, `fee_items`, `audit_log`, `events`, `consents`.

**Additive DDL, requested from the data session (D-091).** It must be consistent with entity spec §6.1.
```sql
create table claim_challenges (            -- OTP + magic links
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  user_id uuid references auth.users(id),   -- null until a magic link is redeemed
  kind text not null check (kind in ('domain_email','registry_contact','magic_link')),
  target_masked text not null,              -- never the raw contact (N-12)
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_by uuid,                          -- ops user for magic links
  redeemed_at timestamptz,
  created_at timestamptz not null default now());
alter table school_claims add column provisional boolean not null default false,
  add column decision_reason text;
alter table school_members add column status text not null default 'active'
  check (status in ('provisional','active'));
alter table enquiries add column read_at timestamptz;
```
The data session also owns `fee_reports`, `fee_responses` and `school_documents` (entity spec §6.1) and `featured_placements.order_ref` wiring to invoices.

**This repo (views, grants, RLS):**
- `api.portal_fee_reports_for_school`: redacted rows, no `reporter_id` and no `evidence_path`, filtered by `is_school_member(school_id)`.
- `api.portal_enquiries`: `id, school_id, class_code, message, status, created_at, read_at`, plus the parent contact only when shared. It never includes `child_id`.
- `api.public_school_updates` (approved notices + approved posts + change log) and `api.public_school_widget` (school_code, canonical path, the next ≤3 class statuses) for `/embed`.
- `api.public_featured_placements`: rows active today for a `city_id`, fields limited to school_id, class_codes, placement and label.
- Migrations. Grant fixes from §2 (additive grants). Member insert on `fee_responses` and `school_documents`; member update on `enquiries(status, read_at)`; `school_members` insert for a school admin with `role='staff'` only (a staff invite); nobody may insert or update their own row (D-061, no self-promotion). **No** member delete or update on `update_reports`, `fee_reports`, `audit_log` or `field_provenance` (D-062).
- D-084 immediate publish runs through one `SECURITY DEFINER` function, `portal_publish_edit(school_id, field, value, evidence_id)`. It checks `is_school_admin`, confirms the claim is active and not provisional, checks the field against the D-084 allowlist, writes `field_provenance` and `audit_log`, and enqueues the ops audit item. Direct table updates by members stay denied.

Rank: search and city-list ordering (`db/views/010_public_schools.sql`, `src/lib/db/public-adapter.ts`) must never reference `claim`, `school_members` or `featured_placements`. Sponsored cards render in their own slot outside the organic order.

## 5. Rules

- **Trust (N-13, D-060, D-089):** claiming is free and never changes rank. Featured cards appear only on city and list pages from 1 Dec, with the sponsored border **and** a visible "Sponsored" label. They never appear on a school page's facts and never sit above a card whose deadline is ≤7 days away. Paid features never change labels, the order of facts, or the verified badge.
- **Cannot hide (D-062):** parent fee reports (the only option is Dispute), the change log, stale "re-checking" markers (D-026, D-087), and the Sources section. The portal UI has no controls for these, and RLS denies them.
- **Ownership ≠ verification (N-05):** a claimed school's self-reported facts stay `school_reported` until the school confirms them (Verified by school) or ops confirms them. D-084 immediate publishes carry the "Verified by school" label.
- **Roles (D-061):** admin handles everything, including members, fee actions, the widget and featured purchases. Staff handle seats, notice drafts and the enquiry inbox. Staff edits go through review regardless of field. Provisional users can only draft.
- **Privacy (D-067..D-069):** enquiries and fee reports carry no child data into the portal. Claim letters sit in a private bucket readable only by the owner and staff. The `claimed_value` stored in v1 evidence and the OTP targets are masked. Parent fee reports need the `fee_report` consent (`school-entity-page.md` §5.3). Media follow D-032.
- **Audit (N-06):** every portal write to admissions, fees or seats goes through `audit_log` triggers, and member changes are already audited.
- **SEO:** `/for-schools` is indexable. `/for-schools/claim/**`, `/portal/**` and `/embed/**` are `noindex`. The widget's crawlable `<a>` points at the canonical `/[locale]/[city]/[slug]-[school_code]` (D-040). Everything else follows `docs/guidelines/seo-geo.md`.

## 6. Acceptance criteria

- [ ] `approveClaim` succeeds end to end for an ops user against the live grants. A failed write shows an error; it is never silent.
- [ ] A school claims via domain OTP and confirms one field in under 10 minutes (M2).
- [ ] A wrong OTP five times locks the challenge. Resend is throttled. `claim_challenges` never contains a raw email or phone.
- [ ] A magic link is single-use, expires after 7 days, and a second redemption shows "This link was already used".
- [ ] A provisional user's edits do not appear on the public page before ops approves the claim.
- [ ] An admin changes a current-session closing date: it is live immediately, an alert event fires, and an ops audit row exists with a 24 h due time. Moving a deadline earlier instead creates a review item and nothing goes public.
- [ ] A staff member cannot publish immediately, cannot manage members, and cannot promote themselves (RLS test in a rolled-back transaction).
- [ ] Notice upload fills the date fields from the PDF, each field shows its PDF hint, and the notice cannot be submitted until every field has been reviewed.
- [ ] The fee screen shows no reporter identity. Correct requires a circular. Dispute moves the report to ops. No delete control exists anywhere.
- [ ] The portal copy maps all four seat labels.
- [ ] `/embed/school/[code]` has no cookies, is `noindex`, is ≤5 KB gzip, and the script variant puts a crawlable `<a>` in the host DOM.
- [ ] No featured UI renders before 1 Dec. Afterwards, featured cards carry a border and the "Sponsored" text and never appear on school pages.
- [ ] A grep or test shows no ordering expression uses `claim` or `featured_placements`.
- [ ] `docs/screen-map.md` row 11 and `docs/design-gaps.md` are updated for every screen without a design (checklist, admissions editor, fees, enquiries inbox, widget page, members page).

## 7. Deferred and open

**Deferred:**
- Insights and anonymous benchmarks: when real traffic exists (Deferred table).
- Enquiry packages (`enquiries.billable`): P2 (I3).
- Subscription: P3.
- Multi-school membership switcher: when the first organisation with more than one campus claims (D-031).
- Change-monitor-driven "we noticed your website changed" prompts: M3.

**Settled since 27 Sep:**
- Whether class range and facilities join D-084's immediate-publish list: settled by D-100. They
  do not — class range and facilities stay in review, same as this spec already said, and D-100
  confirms it explicitly.

**Open (not settled in decisions.md):**
1. What does "current session" in D-084 mean during October–March: the session being admitted for (2027-28), or the running one (2026-27)? The recommended answer is the admission session; otherwise the season's main edits all wait in review.
2. D-063 says widget installation is "part of completing a claim". Is it a checklist item (recommended), or a gate before the claim counts as complete?
3. OTP delivery channels: an email provider for domain OTP, and a voice/WhatsApp provider for registry contacts (the WhatsApp provider is still open under D-095).
4. **(29 Sep, req. 22/26)** Admin-vs-staff split for events/news/jobs/admissions writes: staff-inclusive, matching D-061's existing "staff handle seats, notice drafts and enquiries" carve-out (recommended), or admin-only for all four, which needs new role checks built into every portal action?
5. **(29 Sep, req. 25)** Which table the "admissions editor" (req. 10) targets going forward: redefine it onto `admission_cycles`, the table actually live on `/admissions` and the school page (recommended), or keep building toward the never-shipped `admission_notices` pipeline, with both tables live in parallel indefinitely?
6. **(29 Sep, req. 28)** Core-info publish gating: keep D-084's existing split between immediate-publish and review-gated core fields (recommended), or move everything behind pre-publish ops review, as the latest request states literally?
7. **(29 Sep, req. 30)** Teacher profile creation: keep D-004's consent rule as is — school admins invite/accept affiliations, never author a profile (recommended) — or reopen D-004 to let school admins create teacher profiles on a teacher's behalf?
