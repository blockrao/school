# Data retention — pending legal review

**Status: pending legal review.** The rule below is implemented and running (see
`purge_expired_documents()` in
`supabase/migrations/20260925102636_application_help_functions.sql`), but the
retention periods themselves are working defaults, not a reviewed policy. Treat
every number on this page as provisional until someone with the right mandate
signs off — particularly given this is children's documents (birth certificates,
Aadhaar, address proof).

## What's retained

`documents.retain_until` (a required column — every row must have one) is set at
upload time to **12 months from the upload date**
(`src/app/[locale]/my/admissions/[orderId]/actions.ts`, `uploadDocument`).

The original design intent was a shorter window when it's knowable — `least(upload
+ 12 months, last application closed + 90 days)` — but "last application closed"
isn't known at upload time (applications for that document may not exist yet, or
may still be open), so this isn't computed or enforced yet. Recomputing
`retain_until` downward once an order's applications all reach a terminal state
(`submitted`/`result_*`/`withdrawn`) is a follow-up, not built in this pass.

## How purging works

`purge_expired_documents()` (SECURITY DEFINER, not granted to any app-facing
role):
1. Deletes the Storage object for every `documents` row where
   `retain_until < now()` and `deleted_at is null`.
2. Soft-deletes those rows (`deleted_at = now()`) rather than hard-deleting —
   keeps an audit trail of what existed and when it was purged.

Run manually via `pnpm purge:documents` (connects as `DATABASE_URL`, same trust
level as `scripts/db-migrate.mjs`). **Not on a schedule yet** — wiring this to
`pg_cron` or an external scheduler (Vercel Cron hitting a secret-checked route,
matching the `/api/revalidate` pattern) is a deliberate follow-up, not decided
here.

## Open questions for review

- Is 12 months the right default, or should it be shorter (e.g., tied to the
  admission cycle) or explicitly consent-driven (parent chooses)?
- Should a parent's own delete (point 4 of the Apply plan — parents can delete
  their own documents) be logged differently from an automatic purge, for audit
  purposes?
- Real scheduling mechanism and cadence.
- Whether India's DPDP Act imposes a specific maximum retention period for a
  minor's documents that should override the default above.
