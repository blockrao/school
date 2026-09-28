# Application help (concierge) — Developer Spec

**Status:** draft (§2 describes shipped code; §3–§6 are draft) · **Owner:** Claude Code (build), Prav (approve)
**Canonical location:** this file. Supersedes the feature's sections in older planning docs (see docs/decisions.md → document map).
**Decisions:** D-004, D-005, D-006, D-009, D-010, D-011, D-067, D-068, D-069, D-071, D-073, D-080, D-091, D-095, D-103, D-104, D-108, N-09, N-10, N-11, N-13 (see `docs/decisions.md`) · **Guidelines:** `docs/guidelines/seo-geo.md`, `docs/guidelines/content-and-trust.md`, `docs/guidelines/design.md`

## 1. Purpose and scope

Parents pay SchoolOye a flat fee to prepare and submit school application forms for them. Parents approve every form before it is submitted and pay school fees to the school themselves. Concierge goes live **1 Nov 2026** (D-006). It is the first revenue line (D-011) and the second north-star metric (D-008). It runs as a manual service backed by software: one fulfilment person works from an ops board. It never sells, implies or brokers a seat (D-010, N-13).

**In scope**
- Packages and pricing from the D-095 test price points, per city (Jaipur and Gurugram, per D-080). Which price applies in which city is not decided.
- The order flow: pick a child, pick a package, check out, pay (mock or manual now, Razorpay later), record consent.
- Intake (child and parent details). It is stored once and mapped per school through `form_mappings`.
- The document vault: private bucket, masked Aadhaar only, per-purpose consent, retention and purge (D-068).
- An ops fulfilment board: pick schools, create applications, prepare forms, record parent approval, submit, capture the application number.
- Parent approval before submission. Status tracking in `/my/admissions`. WhatsApp status updates once a provider is chosen.
- Invoices with GST, refunds, and the guardrail copy.

**Out of scope**
- A common application form sent to schools. D-009 keeps this out of V1. The intake model here is internal only.
- The relocation package (₹4,999+). It is Product Spec F8, P2, and needs OpenSeat request intake.
- Offline-form printable pre-fill (F6, P1) and the partner network for physical submission (F9, P3).
- Parent membership and Child Pass (D-011, test later). A full student passport waits for repeat usage across two seasons (Deferred table).
- Referral fees from schools. These are never allowed (D-010).

## 2. Current state (verified against the repo on 27 Sep 2026)

`docs/screen-map.md` row 10 marks Application Help "designed+built". The parent-facing part is built. Fulfilment is not. There is **no e2e spec** for these routes (`e2e/` holds only home, shell, city, locality, schools and school-teachers specs), so under CLAUDE.md's definition of done the screen is not complete.

| Area | What exists | Path |
|---|---|---|
| Landing (7a) | Four-step "how it works", "does not sell admissions" and "school fees paid separately" copy, "From ₹X" price from `products`. EN and HI copy. **Indexable**, with a canonical URL and hreflang | `src/app/[locale]/admissions/help/page.tsx` |
| Child picker + package (7b) | Adds a child inline if none exists (logs a `child_profile` consent), shows a radio list of children, then a radio list of `help_%` products. Marked `// design-pending` and logged in `docs/design-gaps.md` | `…/help/package/page.tsx`, `…/help/actions.ts` (`addChild`, `startCheckout`) |
| Checkout (7c) | Shows the GST-inclusive breakdown. `payForOrder` → provider `createOrder` | `…/help/checkout/page.tsx` |
| Payment providers | `PaymentProvider` interface covering `mock`, `manual` and `razorpay`. Razorpay **throws "not implemented"**. `PAYMENT_PROVIDER` defaults to `manual`. `mock` cannot boot when `VERCEL_ENV=production` | `src/lib/payments/provider.ts`, `providers/{mock,manual}.ts`, `src/lib/env.server.ts` |
| Mock checkout | "Simulate success/failure" page, which calls `markOrderPaid` | `…/help/checkout/mock/{page,actions}.ts(x)` |
| Manual confirm | "We'll confirm payment details with you shortly" page | `…/help/checkout/confirm/page.tsx` |
| Mark paid | Connects to a separate `pg` instance as `payments_service` (`DATABASE_URL_PAYMENTS`), which can only run `mark_order_paid` | `src/lib/db/payments-role.ts` |
| Intake (7d) | Gender, parent name, address, sibling, category (general/EWS/DG) → `save_order_intake` | `src/app/[locale]/my/admissions/[orderId]/details/page.tsx`, `…/[orderId]/actions.ts` |
| Vault (7e) | Five-item checklist (birth certificate, address proof, child photo, "Child's Aadhaar" → `aadhaar_masked`, parent ID → `other`). Uploads go to the `documents` bucket at `{uid}/{child}/{doc}.{ext}` with a sha256 and `retain_until` = upload + 12 months. A `document_storage` consent row is inserted **on every upload** | `…/[orderId]/documents/page.tsx`, `actions.ts` |
| Status (7f) | Orders list. Applications are shown through `ApplicationStatusRow` (4 tones, 10 statuses). "Review and approve" calls `approve_application` directly, **with no preview** | `src/app/[locale]/my/admissions/page.tsx`, `actions.ts` |
| Ops | `/ops/orders` lists only `awaiting_payment` orders, with a "Mark paid" button (a design-gap row). No board, no application creation, no school picker. `/ops/tasks` has an `application` task kind but no link to orders | `src/app/ops/orders/*`, `src/app/ops/tasks/page.tsx` |
| DB functions | `create_application_order` (reads price from `products`, logs an `application_help` consent), `save_order_intake` (allowed while awaiting_payment, paid or in_progress; locked once any application is submitted), `approve_application`, `mark_order_paid` (idempotent, `payments_service` only), `purge_expired_documents` (no grant; run through `pnpm purge:documents`) | `supabase/migrations/20260925102636_application_help_functions.sql`, `20260925110545_lock_order_intake_after_submission.sql` |
| Grants / RLS | Parent: select-only on orders and applications; CRUD on `children`; select, insert and delete on `documents`. `products` readable by anon. Storage policies are **owner-folder only; staff have no read** | `20260925102638_narrow_application_help_grants.sql`, `20260925102637_documents_storage_bucket.sql` |
| Role | `payments_service` migration contains a password placeholder and is applied by hand | `20260925102635_payments_service_role.sql` |
| Account deletion | `delete_my_account()` deletes orders, applications, documents and storage objects, and anonymises consents. The header flags that financial-record retention conflicts with this | `20260925190809_delete_my_account_function.sql` |
| Retention doc | Default of 12 months, "pending legal review". Purge is **not scheduled** | `docs/ops/data-retention.md` |
| Not built | School selection, form preview, ops fulfilment board, WhatsApp sends, Razorpay, invoices, refunds, a displayed consent notice at order time, `form_mappings` usage, e2e tests | — |

**Data access note.** `src/lib/db/application-help.ts` reads raw `products`, `children`, `application_orders`, `applications` and `documents` through the session client, under owner RLS. N-10 and `docs/spec/data-and-trust.md` say the app never reads raw tables. This owner-scoped pattern is now a documented N-10 exception (D-103; see §7).

## 3. Requirements

### Parent

1. **P0 Landing.** Show the price per city ("From ₹X in {city}", read from `products`). Place the L6 statement above the CTA: *"SchoolOye provides application assistance. Admission decisions rest entirely with the school."* Keep "School form and admission fees are paid directly to the school." Never use "guaranteed", "seat", "direct admission" or "improve your chances".
2. **P0 Package by city.** Show only products for the order's city. D-095 lists test price points only (Per school ₹299/₹499; Season pack, up to 5 schools, ₹1,499/₹2,499); it does not assign them to Jaipur or Gurugram, and city-specific pricing is not decided (Prav). The `help_bundle_3` code referenced in `package/page.tsx` is not a D-095 tier. Deactivate it or get Prav to confirm it. Relocation (₹4,999+) is hidden until P2.
3. **P0 Child picker.** Keep the current design-pending version. The name field says "full name (as on birth certificate)" but writes to `children.first_name`. Split this: `children.first_name` stays the D-067 minimum, and the full legal name moves to order intake (req. 6). Show the empty state "Add your child to get started" when there are no children.
4. **P0 Consent at order.** Before "Continue" on the package step, show the itemised application-help notice (version `application-help-2026-09`) with a required checkbox. The consent row `create_application_order` already inserts must match a notice the parent actually saw (D-069, L1).
5. **P0 Checkout.** Show the GST-inclusive total, "You pay now", and "School fees are not included". Handle the payment-failed state (the `?result=failed` mock path already exists). For a manual order, show "Awaiting payment confirmation" with the WhatsApp or UPI instructions ops will send.
6. **P0 Intake (common model).** "Share details once": child's full legal name, gender, parent or guardian name(s), address, sibling, category, current school (`children.current_school_text`). Lock it after first submission (already enforced). After that, show "Contact us to change details". Add no fields beyond what the target schools' forms require (D-067 principle).
7. **P0 School selection.** After payment, a "Pick your schools" step lets the parent choose up to the package's count from the city's schools that have an open or rolling current-session cycle. The step is built from `api.*` views. Selecting a school creates a pending request only. Ops create the `applications` rows (req. 13). If the timing is 0–7 days, show the deadline in margin red with a text label, following the visual rules.
8. **P0 Vault.** Show the checklist with "N of 5 ready". The Aadhaar row reads **"Child's masked Aadhaar (first 8 digits hidden)"** and links to how to download a masked Aadhaar from UIDAI. Accept images and PDFs of 5 MB or less. Show a delete confirmation. Uploads must work on phone photos of 2–5 MB (req. 22). Record one `document_storage` consent per order, not one per file.
9. **P0 Review and approve.** When an application reaches `awaiting_parent_approval`, the parent sees a read-only preview of the prepared form (field list or ops-uploaded screenshot), the school, the form fee payable to the school, and the deadline. Buttons: **Approve** or **Ask for a change** (free text → ops). Approval records `parent_approved_at` only. It does **not** mark the application submitted (§4).
10. **P0 Tracking.** Each application row shows the status label (never colour alone), the application number when captured, the next action and its due date in IST, and the freshness line "Updated N days ago". Empty state: "We're getting started on your applications."
11. **P0 WhatsApp updates** at: paid, form ready for approval, submitted (with the application number), school fee due, interview or test date, list or result out. Send only with a `whatsapp_alerts` or application-help consent. These are template messages through the provider (open, D-095). Until the provider exists, ops send them by hand from the shared inbox (K5) and log them.
12. **P1 Invoice and refund views.** Show a "Download invoice" link on a paid order. Show refund status on refunded orders.

### Ops (admissions desk)

13. **P0 Fulfilment board** at `/ops/orders`, with columns Paid → Intake done → Preparing → Awaiting approval → Submitted → Tracking → Closed. Each card shows the child's first name, package, the schools picked against the package limit, missing documents, and the nearest deadline. Ops can create `applications` rows for the picked schools with `admission_cycle_id` set. Each application gets an `ops_tasks` row (kind `application`, `ref_table='applications'`).
14. **P0 Prepare.** A read-only intake panel plus the `form_mappings` row for that school and academic year, if one exists. Documents open through short-lived signed URLs (60 s), and every view is audit-logged (L7). Unmasked Aadhaar is rejected: ops delete the file and ask the parent to re-upload.
15. **P0 Submit guard.** "Mark submitted" requires `parent_approved_at` to be set and a `school_application_no` (or a screenshot note). Status then moves to `submitted` and `submitted_at` is set.
16. **P0 Payment confirmation.** Keep "Mark paid" for the manual provider. Record who confirmed it and the payment reference entered (UPI or UTR). Today the reference is the synthetic `manual_<id>`.
17. **P1 Mapping library (F7).** After each submission, save or update `form_mappings.mapping` (intake key → school form field) so the next form is faster.
18. **P0 Refunds.** Policy (from the current copy, awaiting Prav's confirmation): a full refund for each school whose form has not been submitted. Ops record the amount and reason. The order goes to `refunded` when fully refunded. A partial refund stays `in_progress` or `completed` with a refund row (§4).
19. **P0 Invoices.** Issue an invoice on payment with a sequential `number` (e.g. `SO/2026-27/000123`), `amount_inr`, `gst_inr` = amount × rate / (100 + rate), and `customer_type='parent'`. The PDF is stored privately.

### System

20. **P0 Razorpay** (when the keys exist). Add `providers/razorpay.ts`. The amount comes from `application_orders.amount_inr` server-side, never from the `amountInr` hidden field `payForOrder` passes today. Verify the webhook signature, then call `markOrderPaid`. Relax the CSP (`script-src`, `frame-src`, `connect-src` for `checkout.razorpay.com` / `api.razorpay.com`) and `Permissions-Policy: payment=()` in `next.config.ts` only for the checkout route.
21. **P0 Retention job.** Schedule `purge_expired_documents()` weekly (D-104), using Vercel Cron and a secret-checked route that runs as the migration role, or the equivalent. Once all of an order's applications are terminal, lower `retain_until` to `least(retain_until, last_terminal + 90 days)`.
22. **P0 Upload size.** Server Actions default to a 1 MB body limit, and `next.config.ts` sets no `serverActions.bodySizeLimit`. Set it to about 6 MB or move uploads to signed upload URLs.

## 4. Data

Live tables, with their columns taken from `src/lib/db/types.ts`:
- `products` (code, name, price_inr, gst_rate default 18, active). **There is no city column**, so city-specific prices, once decided, need either city-suffixed codes (`help_single_jaipur`, `help_season_gurugram`) or a `city_id` column. Prefer the codes: they need seed upserts only, which are non-destructive (D-073).
- `application_orders` (user_id, child_id, product_code, amount_inr, status `order_status`, payment_ref, intake jsonb).
- `applications` (order_id, school_id, admission_cycle_id, status `application_status`, school_application_no, submitted_at, next_action, next_action_due, parent_approved_at, notes).
- `children`, `documents` (kind `doc_type`, storage_path, sha256, retain_until, deleted_at), `consents` (purpose `consent_purpose`).
- `form_mappings` (school_id, academic_year, form_url, mapping jsonb; unique per school and year; staff-only RLS).
- `invoices` (number unique, customer_type, customer_id, amount_inr, gst_inr, gstin, pdf_path; staff-only RLS).
- `ops_tasks`.

**Changes owned by this repo** (functions, RLS, grants; D-072):
```sql
-- approval stamps only; ops submit (replaces the status='submitted' jump)
UPDATE applications SET parent_approved_at = now(), updated_at = now()
WHERE id = p_application_id;             -- inside approve_application, status unchanged
-- staff read of vault objects (RLS on personal data → needs Prav's explicit yes, D-073)
CREATE POLICY documents_staff_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_staff());
```
The school picker (req. 7) reads `api.public_schools` and the admissions view through `public-adapter.ts`. It never reads raw cycles.

**Additive DDL for the data session** (D-091):
- `order_school_picks` (order_id, school_id, created_at). Alternatively, reuse `applications` with status `not_started` created by a SECURITY DEFINER `pick_school(order_id, school_id)` that enforces the package count. That option needs no DDL and is preferred.
- `refunds` (id, order_id, application_id null, amount_inr, reason, provider_ref, created_by, created_at).
- `invoices.order_id uuid`, because `customer_id` alone cannot tie an invoice to an order.
- `doc_type` value `id_proof_parent`, to replace the `other` stand-in.
- `application_orders.paid_confirmed_by uuid`.

**Deletion.** `delete_my_account()` hard-deletes orders. Once real money moves, it must anonymise orders, invoices and refunds instead (tax-record retention). That is a destructive change to the function's behaviour and needs Prav's yes and a legal read (§7).

## 5. Rules

- **Trust (D-010, N-13, L6).** Parent-paid only. There are no referral fees from schools, and no school receives or pays for a concierge lead. SchoolOye never asks for a parent's portal password: the parent creates any school-portal account themselves and passes it on through an OTP or screen-share on their own device, or submits it themselves from ops' prepared data. SchoolOye never pays a school fee on the parent's behalf. Copy calls the service "paperwork assistance", flat-priced. No copy implies better selection chances. The concierge CTA sits next to a deadline, never as a sponsored slot (D-089).
- **Privacy (D-067–D-069, N-09).**
  - Child data lives only in owner-RLS tables and is never joined into `api.*` views.
  - Consent is recorded per purpose (`application_help`, `document_storage`, `whatsapp_alerts`) against a displayed, versioned notice.
  - Consent withdrawal stops fulfilment and triggers document deletion.
  - Only masked Aadhaar is stored. There are no public URLs; only signed URLs (60 s, server-generated).
  - `retain_until`: documents are deleted at season end (30 Apr) or 12 months after upload, whichever comes first (D-104, amending D-068 to match D-010). Purge runs weekly on a schedule.
  - Each vault object is shared only with the target school, through the submission itself.
  - Access to documents is logged in `audit_log`.
- **Money.** Prices come only from `products`, read server-side (already enforced; `scripts/verify-views.ts` checks it). The Mock provider is never allowed in production. `payments_service` can execute only `mark_order_paid`. No service-role key (N-11).
- **SEO.** `/admissions/help` is the only public route. It is indexable: D-108 scopes D-053 to listing/filter/landing pages and makes service pages with real content indexable. Everything under `/my/*`, `/ops/*`, and the checkout pages stays `noindex`. See `docs/guidelines/seo-geo.md`.

## 6. Acceptance criteria

- [ ] The landing page shows the L6 statement, the "school fees separate" line and per-city "From" prices read from `products`. No banned words (grep test).
- [ ] The active products are exactly the D-095 tiers for each city. Ordering "Per school" charges the `products` price for that order's city.
- [ ] An order cannot be created without the consent checkbox. The `consents` row carries the displayed notice version.
- [ ] `create_application_order` accepts no amount (`pnpm verify:views` stays green). Razorpay uses the DB amount and rejects an unsigned webhook.
- [ ] A 4 MB phone photo uploads successfully. A 6 MB file shows the size error.
- [ ] The Aadhaar row says "masked". Ops can open a document through a signed URL, and each view writes an audit row.
- [ ] A parent cannot approve an application unless it is in `awaiting_parent_approval`. Approval does not set `submitted`. Ops cannot mark it submitted without `parent_approved_at`.
- [ ] Parent picks cannot exceed the package's school count.
- [ ] Each status change produces a WhatsApp message (or a logged manual send) using the template text.
- [ ] Every paid order has one invoice, numbered sequentially, with the GST-inclusive split correct to the paisa.
- [ ] A refund for an unsubmitted school is recorded, and the order status reflects it.
- [ ] `purge_expired_documents` runs on a schedule. A row past `retain_until` loses its storage object at the next weekly run.
- [ ] Playwright covers the full path (e2e, mock provider): add child → package → pay → intake → upload → approve. The axe smoke test passes. Screenshots exist for 7a–7f.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass.

## 7. Deferred and open

**Deferred**
- Relocation package: P2, with OpenSeat "I need a seat" requests.
- Offline-form pre-fill (F6): P1, if orders show demand.
- Physical submission partners (F9): P3.
- Full student passport: after repeat concierge use across two seasons.
- Automated form filling from `form_mappings`: after 50 paid families show where the time goes (Tracker & Concierge doc).
- Price A/B test (₹1,499 vs ₹1,999 Season pack in Jaipur): run in November. It is the doc's experiment and does not change D-095 until Prav records a new decision.

**Settled since 27 Sep**
- Document retention: settled by D-104 (see §5). Documents are deleted at season end (30 Apr) or 12 months after upload, whichever comes first; purge runs weekly.
- Whether owner-scoped RLS reads of personal tables through the session client become a documented N-10 exception: settled by D-103. They do, for authenticated, noindex owner/staff pages, provided the module lists its tables at the top.

**Open (not settled in decisions.md)**
1. WhatsApp provider and template approval (named open in D-095).
2. Season staffing (D-095). The capacity assumption of about 40 minutes per application gives roughly 60–80 applications a week per person at peak. The doc's target of 150 families by 28 Feb works out to about 450–750 applications. Measure in November. The D-005 week-12 gate numbers are still unset.
3. Payment gateway, GST registration and GSTIN, and SAC code. Invoice PDF format.
4. Refund policy wording. Only the package-page copy exists.
5. Legal review:
   - storing masked Aadhaar and minors' documents under DPDP;
   - consent notice text;
   - terms of service (`/terms` is a placeholder);
   - anonymising versus deleting orders on account deletion;
   - whether the concierge counts as an "agent" under state admission rules.
6. Where the vault lives. The Admissions Platform doc proposes Cloudflare R2. The repo uses a Supabase Storage bucket.
7. City-specific pricing: which D-095 test price point applies in Jaipur and which in Gurugram (Prav).
8. D-071 says `DATABASE_URL_PAYMENTS` must move off the discarded project `xpccgcctmnfwbcbhwsqv`. Create the `payments_service` role on `ybevzpryuvgxclkhdjld` before 1 Nov.
