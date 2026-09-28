# Auth & security hardening pass — status (2026-09-25)

Resume doc for the 8-item hardening pass requested 2026-09-25. Work order and the
original audit findings are preserved below so a future session doesn't need to
re-derive them. Ship order: implement each item, push, 3-line report, move on.
**Personal-data policy changes and anything destructive need the user's explicit
"yes" on the exact SQL shown in chat — a vague "do it" is not enough (see item 2).**

## Status at a glance

| # | Item | Status |
|---|---|---|
| 1 | Account basics | **Done** — pushed `3d04949` |
| 2 | DPDP rights | **Partially done** — export + consent history pushed `eae1fc3`; account deletion **designed, not applied** (see below) |
| 3 | Abuse protection (Turnstile + rate limits) | Not started |
| 4 | Staff/portal MFA | Not started |
| 5 | Security headers (CSP/HSTS/etc.) | Not started |
| 6 | Audit log | Not started — but the hard part already exists, see audit notes below |
| 7 | Monitoring (Sentry, Dependabot, CodeQL) | Not started |
| 8 | docs/SECURITY.md | Not started |

## Item 1 — Account basics (done)

- First-login onboarding at `/[locale]/onboarding` (name + terms/privacy consent,
  recorded as a `consents` row with `purpose='account'`, version in
  `src/lib/consent.ts`'s `ACCOUNT_NOTICE_VERSION`). Gates both sign-in paths
  (`verifySignInOtp` in `src/app/[locale]/(auth)/sign-in/actions.ts`, and
  `src/app/auth/callback/route.ts`) via `src/lib/db/onboarding.ts`'s
  `needsOnboarding()`/`postSignInPath()`.
- Placeholder `/[locale]/terms` and `/[locale]/privacy` pages (pending legal
  review, same status as `docs/data-retention.md`).
- `/[locale]/my/account`: name view/edit, sign-out (`scope: "local"` this device /
  `"global"` all devices, via `supabase.auth.signOut({ scope })`). Linked from the
  existing `/my` alerts hub (which is NOT renamed — still the WhatsApp-alerts
  management page bottom-nav calls "Account"; `/my/account` is the new real
  settings page, reachable via a link on `/my`, not a bottom-nav change).
- Logged in `docs/design-gaps.md` and `docs/screen-map.md` (no design files exist
  for any of these screens — minimal functional versions only).

## Item 2 — DPDP rights (partially done)

**Shipped** (`eae1fc3`): `/my/account/export` (GET route, JSON download of every
table scoped to the user — profile, children, orders/applications, alerts,
shortlists, enquiries, consents, school claims, teacher profile — document *files*
are metadata-only, not embedded). Consent-history list on `/my/account` (read-only,
straight off the `consents` table).

**Not shipped — account deletion.** Fully designed, SQL written, **not applied,
not committed**. The migration file exists on disk right now:

```
supabase/migrations/20260925190809_delete_my_account_function.sql
```

Full text of that file (reproduce here in case the file itself is ever lost —
it is the source of truth, this is just a backup copy):

```sql
-- DPDP account deletion. SECURITY DEFINER so a plain `authenticated` user
-- (with no direct DELETE grant on most of these tables) can delete exactly
-- their own data — same bridging pattern as mark_order_paid/purge_expired_documents.
--
-- Two different outcomes depending on whether another party has a legitimate
-- ongoing interest in the record, independent of this user's continued
-- account:
--   ANONYMIZED (row kept, identity stripped): consents (compliance record of
--     what was agreed/withdrawn and when — the whole point is it must survive
--     the person who granted it), enquiries (the school still has a real
--     enquiry to answer; only the asker's identity is removed), events
--     (analytics, already has anon_id as a non-PII identifier).
--   DELETED (row removed): everything else — children, documents (+ Storage
--     files), alert_subscriptions, shortlists, school_members, teachers (+
--     experience/qualifications + Storage photo), teacher_claims,
--     school_claims, application_orders (+ applications via cascade).
--
-- Flagged, not resolved here: application_orders represents paid admission-
-- help transactions. Deleting them outright is the right call *today* (no
-- real payments have been processed yet — PAYMENT_PROVIDER is mock/manual
-- pre-launch), but once real money moves through this table, financial-
-- record-retention rules (India's IT Act generally expects ~6-8 years) may
-- require anonymizing rather than deleting order history. Revisit before
-- launch if that's a concern; not blocking today given zero real transactions.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Storage objects first — DB row deletion never touches Storage files.
  -- All three buckets use {user_id}/... as their top-level folder (see each
  -- bucket's own RLS policies), so a prefix match catches everything without
  -- joining through documents.storage_path / teachers.photo_storage_path.
  DELETE FROM storage.objects
    WHERE bucket_id = 'documents' AND (storage.foldername(name))[1] = v_uid::text;
  DELETE FROM storage.objects
    WHERE bucket_id = 'teacher-media' AND (storage.foldername(name))[1] = v_uid::text;
  DELETE FROM storage.objects
    WHERE bucket_id = 'school-claims' AND (storage.foldername(name))[1] = v_uid::text;

  -- Anonymize (see header comment for why these three, specifically).
  UPDATE consents
    SET user_id = NULL, phone = NULL, withdrawn_at = COALESCE(withdrawn_at, now())
    WHERE user_id = v_uid;
  UPDATE enquiries SET user_id = NULL, child_id = NULL WHERE user_id = v_uid;
  UPDATE events SET user_id = NULL WHERE user_id = v_uid;

  -- Explicit deletes for tables with no ON DELETE CASCADE from profiles
  -- (must run before the profiles delete below, which would otherwise hit a
  -- foreign-key violation on these).
  DELETE FROM teacher_claims WHERE user_id = v_uid;
  DELETE FROM teachers WHERE claimed_by = v_uid; -- cascades to teacher_experience/teacher_qualifications
  DELETE FROM school_claims WHERE user_id = v_uid;
  DELETE FROM application_orders WHERE user_id = v_uid; -- cascades to applications

  -- Everything else (children [+ documents rows], alert_subscriptions,
  -- shortlists, school_members) has ON DELETE CASCADE from profiles.user_id,
  -- so one delete here finishes those.
  DELETE FROM profiles WHERE user_id = v_uid;

  -- Ends the ability to sign in; cascades through Supabase's own
  -- auth.* housekeeping tables (sessions, refresh_tokens, identities, mfa).
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
```

**Why it stalled**: the auto-mode permission classifier requires the user's
specific "yes" said in direct response to seeing the exact SQL — a general "let's
do it and finish it logically" from an earlier point in the conversation wasn't
accepted as specific-enough confirmation tied to this exact statement. Asked again
via a direct yes/no question; the user chose "hold off" rather than reject the
design outright.

**To resume**: show the SQL above again, get an explicit yes tied to that specific
message, then:
1. `pnpm db:migrate supabase/migrations/20260925190809_delete_my_account_function.sql --confirm`
2. `pnpm db:types` (the RPC needs to exist in `src/lib/db/types.ts` before the
   calling code typechecks)
3. Build `/[locale]/my/account/delete/page.tsx` (confirmation page — warning
   copy, a "type DELETE" or checkbox confirmation, no design file so
   `design-pending` + log in `docs/design-gaps.md`) and a `deleteAccount` action
   in `src/app/[locale]/my/account/actions.ts` calling
   `supabase.rpc("delete_my_account")`, then `await supabase.auth.signOut()` and
   redirect home with a farewell state.
4. Consider whether item 4's re-auth-for-sensitive-actions pattern (once built)
   should retrofit onto this action too — account deletion is arguably the single
   most sensitive action in the app. Not blocking item 2's ship, but worth
   revisiting once item 4 exists.
5. Full gate (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`), live
   redirect spot-check, commit, push, 3-line report.

## Item 3 — Abuse protection (not started)

- Cloudflare Turnstile on phone OTP + email magic-link requests. This is a
  **Supabase Dashboard setting** (Authentication → Attack Protection → Enable
  CAPTCHA protection, provider Cloudflare Turnstile) — not something this repo's
  code configures directly. Need from the user: a Turnstile site key + secret key
  (from the Cloudflare dashboard) — the secret goes into Supabase's dashboard
  setting, the site key goes into this repo as a new `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  env var, consumed by a client-side Turnstile widget added to
  `src/app/[locale]/(auth)/sign-in/page.tsx`'s two forms (phone request, email
  request), with the resulting token passed through `signInWithOtp`'s
  `options.captchaToken`.
- Rate limits on: `sendEnquiry` (`src/app/[locale]/school/[idSlug]/actions.ts`),
  school claims (`src/app/for-schools/claim/*/actions.ts`), teacher creation
  (`src/app/[locale]/teachers/create/actions.ts`). No rate-limiting infra exists
  anywhere in the repo yet — needs a decision: Upstash Redis (needs a new external
  account + env vars) vs. a DB-table-based sliding window (no new infra, uses the
  existing Postgres connection, simplest to ship today given "no new required env
  vars unless necessary" has been the pattern all session). Recommend the DB-table
  approach for a first pass given the low current traffic and zero existing
  infra investment.

## Item 4 — Staff/portal MFA (not started)

Audit found good news: `is_staff()` / `is_school_member()` RLS helpers and a single
`requireStaff()` choke-point (`src/lib/db/ops.ts`) already centralize staff auth —
that's the one place to add an AAL2 (`auth.mfa`) check for `/ops`. `/portal`
(school admins) has no equivalent single choke-point yet — check
`src/app/portal/*/actions.ts` for whether one needs to be introduced first.
`src/proxy.ts` currently does nothing but refresh the session cookie — no
auth/aal enforcement of any kind exists at the middleware layer today. Need
Supabase MFA enrollment UI (TOTP, `auth.mfa.enroll`) built from scratch — nothing
exists yet.

## Item 5 — Security headers (not started)

`next.config.ts`'s `headers()` currently only sets `X-Robots-Tag` pre-launch. Add
CSP (nonce-based — needs a `src/middleware.ts`-generated nonce per request, or
Next's built-in nonce support), HSTS, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, minimal `Permissions-Policy`.
CSP origins needed, from the audit: map tiles (`src/components/ui/area-map.tsx` —
hardcoded OpenFreeMap style URL, actual tile/font hosts need runtime inspection of
that style JSON), Supabase (`NEXT_PUBLIC_SUPABASE_URL`), Turnstile's
`challenges.cloudflare.com` (once item 3 lands), no external font origin needed
(fonts are self-hosted via `next/font/google` at build time).

## Item 6 — Audit log (not started, but cheap)

Real audit-log infra **already exists**: `audit_log` table (`actor`, `action`,
`entity_table`, `entity_id`, `before`, `after`, `at` — baseline.sql:602) plus a
generic `audit_trigger()` function (baseline.sql:291) already attached to 7
tables (`admission_cycles`, `applications`, `featured_placements`, `fee_items`,
`school_claims`, `schools`, `seat_status`). Just needs: (a) attaching the same
trigger to tables added since baseline —`application_orders` (mark-paid lives
here), `admission_notices`, `teachers`/`teacher_claims`, `correction_requests`,
`ops_tasks`, `school_members` — a small, mechanical migration; (b) an `/ops` page
reading from `audit_log` (nothing surfaces it today).

## Item 7 — Monitoring (not started)

No `@sentry/nextjs`, no `sentry.*.config.ts`, no `.github/dependabot.yml`, no
CodeQL workflow. `.github/workflows/ci.yml` and `.github/workflows/gitleaks.yml`
exist as style templates for a new CodeQL workflow. Sentry needs from the user: a
Sentry account/project, then `NEXT_PUBLIC_SENTRY_DSN` (client) + `SENTRY_AUTH_TOKEN`
(source-map upload at build time, CI-only) as new env vars.

## Item 8 — docs/SECURITY.md (not started)

Doesn't exist. Cross-reference rather than duplicate: `docs/DATA_ACCESS.md`
(view/grants/RLS architecture), `docs/data-retention.md` (purge policy, pending
legal review), `docs/deploy.md` (env vars, `SITE_INDEXABLE`). Should cover: threat
model, auth design (once items 1-4 ship, document the real thing rather than
planning it in advance), data classification, incident response steps. Probably
the last item to write, once there's a real system to describe.

## Other context from this same session (unrelated to the 8 items, done and shipped)

Before this hardening pass started, the same session also: connected the
`schooloye.com` custom domain (apex + vercel.app → `www.schooloye.com` 308
redirects, `NEXT_PUBLIC_SITE_URL` wired through canonical/JSON-LD/sitemap/email-
redirects, a stale hardcoded `schooloye.in` domain bug fixed along the way) and
built the sitemap index + per-city child sitemap (`/sitemap.xml`,
`/sitemap-jaipur.xml`, L2+ schools + city/locality pages with ≥3 schools). Both
fully shipped and crawl-verified clean on the production domain.
