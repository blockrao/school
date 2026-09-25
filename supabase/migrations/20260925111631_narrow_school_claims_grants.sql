-- Narrows authenticated's inherited full-ALL grant on school_claims and
-- school_members to what Flow 4.13 actually uses. DESTRUCTIVE — REVOKE. Do not
-- apply without explicit sign-off (per CLAUDE.md: REVOKE always needs it,
-- regardless of whether the table holds personal data).
--
--   - school_claims: select/insert — matches claims_insert (own) + claims_self
--     (own or staff); claims_staff (update/review) is staff-only, a claimant
--     never edits their own claim after submitting it.
--   - school_members: select only — matches members_read (own or staff);
--     members_staff (all writes) is staff-only, membership is granted by staff
--     approving a claim (src/app/ops/claims/actions.ts), never self-service.

revoke all privileges on school_claims, school_members from authenticated;

grant select, insert on school_claims to authenticated;
grant select on school_members to authenticated;
