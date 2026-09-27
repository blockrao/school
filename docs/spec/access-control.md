# Access control & authentication — Developer Spec

**Status:** built (describes the implemented model) · **Updated:** 27 Sep 2026
**Canonical location:** this file (was `docs/access-control-design.md`).
**Decisions:** N-09, N-11, D-061, D-073, D-103

Refines "admin has separate access, school operation has different access,
teacher/student/parent are end users" into the concrete role model, RLS
policies, and session/auth controls implemented in this pass. Supabase Auth
is the identity provider throughout — no separate credential store.

## Role model

Three tiers, matching what the schema already distinguishes plus one
addition this pass makes real (school-side admin vs staff):

| Tier | Where it lives | Values | Scope |
|---|---|---|---|
| Platform staff | `profiles.role` | `ops`, `admin` | Global — every school, via `is_staff()` |
| School operation | `school_members` join | `admin`, `staff` (new enum, was free text) | One school only, via `is_school_member(id)` / `is_school_admin(id)` |
| End users | `profiles.role` | `parent` (default) | Their own rows only |

**Platform staff** (`ops`/`admin`) is intentionally left as one tier for this
pass — both use `/ops/*` and `is_staff()` today. The two are not equivalent
in principle (`admin` should be the only one able to change who else has
staff access), but no code currently branches on `ops` vs `admin`, so
splitting them now would be enforcement with nothing to enforce yet. Noted
under Follow-ups.

**School operation** now has a real two-level split, enforced in the
database, not just convention:
- `admin` — full control of the school's own portal, including managing
  other members of that school.
- `staff` — day-to-day reporting only (seat status, notices). Cannot manage
  membership or request profile corrections.

Every existing `school_members` row was migrated to `admin` (the only value
that existed before), so this is additive — nothing currently loses access.

**End users** (`parent`, and the platform's existing `teachers` marketplace
persona, which is a separate claimed-listing concept, not a `profiles.role`
value) are scoped to their own data by `user_id = auth.uid()` policies
already in place throughout the schema.

## Why enforcement lives in Postgres RLS, not app code

Every table above is protected by Row-Level Security, not by an
`if (role !== 'admin')` check in a route handler. This is deliberate and is
the OWASP-recommended shape (ASVS V4 — enforce access control at the
resource, not the presentation layer): even if a page's own guard is
missing, buggy, or bypassed via a direct API call, the database still
refuses the query. App-layer checks (`requireStaff()`,
`requireSchoolMember()`, `src/proxy.ts`) exist for UX (redirecting to the
right page) and as a second layer, not as the actual gate.

## What changed this pass

**Database** (`school_member_roles_audit_and_rate_limits` migration):
- `school_member_role` enum (`admin`/`staff`) replacing the unchecked `text`
  column on `school_members`.
- `is_school_admin(sid)` — mirrors `is_school_admin()`'s existing sibling
  `is_school_member(sid)`.
- A school admin can now update/remove *other* members of their own school
  (`members_school_admin_manage_others` / `_remove_others`), but never
  themselves — self-promotion or self-removal still requires platform
  staff, closing the obvious self-escalation path. Adding brand-new members
  still goes through the existing staff-reviewed claim flow
  (`/ops/claims`) — there's no self-serve invite yet (see Follow-ups).
- Audit coverage closed on the two tables that actually carry privilege
  (`profiles.role`, `school_members`) — previously only business tables
  (`schools`, `school_claims`, etc.) had `audit_trigger` attached.
- `rate_limits` table + `check_rate_limit()` — see below.

**Application**:
- `src/proxy.ts` (existing — Next.js 16's renamed `middleware.ts`; a first
  attempt at this pass added a separate `src/middleware.ts`, which duplicated
  this file and broke the build, since Next.js refuses both conventions at
  once — fixed by deleting it) already refreshed the session cookie for
  `/my`, `/portal`, `/ops`, `/sign-in`, `/for-schools/claim`, so that gap
  didn't actually exist. What it didn't do: fail closed on `/ops` for a
  signed-out request. Added that redirect (to sign-in) as one layer before
  `requireStaff()` runs, reusing the `getClaims()` call this file already
  made.
- `src/lib/db/portal-auth.ts` (new) — `requireSchoolMember()` /
  `requireSchoolAdmin()`, the `/portal` equivalent of the existing
  `requireStaff()`. Wired into `/portal`'s entry page.
- `src/lib/rate-limit.ts` (new) + wired into `requestOtp`,
  `verifySignInOtp`, `requestMagicLink` — throttles by identifier
  (phone/email) and by IP independently, backed by the new Postgres
  function so it holds across serverless instances. Fails open on a
  database error (a limiter bug must never lock out every user).
- `next.config.ts` — added the OWASP secure-headers baseline: CSP,
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS. No third-party
  scripts/styles exist in this app today, so the CSP is strict
  (`script-src 'self'`; `style-src` keeps `'unsafe-inline'` only for
  Tailwind's inlined critical CSS).

## OWASP mapping (quick reference)

| OWASP concern | How it's addressed |
|---|---|
| Broken access control (A01) | RLS on every table, deny-by-default; least privilege via the 3-tier role model; self-escalation blocked on `school_members` |
| Auth failures (A07) | Passwordless OTP/magic-link (no password DB to leak); per-identifier + per-IP rate limiting on every auth action; session refreshed centrally in middleware |
| Injection (A03) | Supabase client uses parameterized queries throughout; no raw SQL built from user input anywhere in the app layer |
| Security misconfiguration (A05) | CSP + standard secure headers now set app-wide; `SITE_INDEXABLE` pre-launch noindex switch (pre-existing) |
| Insufficient logging (A09) | `audit_log` now covers every privilege-bearing table, not just business data |
| SSRF/open redirect | `safeNext()` already restricts post-sign-in redirects to same-origin relative paths (pre-existing, unchanged) |

## Explicitly out of scope this pass (needs a decision, not just code)

- **MFA (TOTP) for platform staff.** Supabase Auth supports it natively;
  needs an enrollment UI and a policy on whether it's required or optional
  for `ops`/`admin`. Not built — flag if you want it prioritized.
- **Self-serve school-member invites.** Right now a school only gets its
  first member through the staff-reviewed claim flow. A school `admin`
  inviting a new `staff` member without going back through `/ops/claims`
  would need its own (rate-limited, audited) invite mechanism.
- **Splitting `ops` from `admin` in practice**, not just in the enum — e.g.
  restricting who can promote a profile to `ops`/`admin` in the first place.
  `/ops/staff` now lets an `admin` change `profiles.role` (built 26 Sep);
  there is still no separate ops-vs-admin permission set beyond that.
- **Supabase Dashboard-only settings** (not changeable from SQL or the terminal): OTP
  expiry window, the project-level SMS/email send-rate caps (a second,
  provider-side backstop behind the new `rate_limits` table), and leaked-password
  protection (irrelevant here since there are no passwords, but relevant if
  a password-based method is ever added). Worth a five-minute pass in
  Authentication → Settings.
