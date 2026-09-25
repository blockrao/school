-- Grants for Flow 4.13 (School Portal). Additive only — school_claims and
-- school_members currently still carry the inherited full-ALL grant and
-- already permit everything this flow needs; narrowing THOSE down is a
-- separate REVOKE, shown for sign-off in
-- 20260925111507_narrow_school_claims_grants.sql, not bundled with additive
-- grants again.

grant select, insert on admission_notices to authenticated;
grant select, insert, update on seat_status to authenticated;
grant insert on correction_requests to authenticated;

-- Plain reference data (class code -> English/Hindi label), no trust-gating
-- needed — same trust level as api.public_boards.
grant select on class_levels to anon, authenticated;
