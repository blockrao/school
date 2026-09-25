-- Application Help (Flow 3.12) write path. application_orders and applications
-- are staff-write-only by RLS (orders_staff_write/apps_staff_write: is_staff()) —
-- a parent can only ever SELECT their own row. Every parent-initiated mutation on
-- those two tables goes through one of these narrow SECURITY DEFINER functions
-- instead of a direct grant, so each one can enforce its own ownership + status
-- checks precisely instead of relying on a coarser RLS policy.
--
-- Guarantees (per explicit sign-off):
--   - Price/GST are never client-supplied — create_application_order takes only a
--     product_code and looks up price_inr from products itself. No function here
--     accepts an amount or a GST figure as an argument at all.
--   - Every function checks auth.uid() owns the child/order it's touching, and
--     only acts while the row is in an allowed status.
--   - SET search_path = public, pg_temp (not just 'public') on every function —
--     blocks a temp-table search_path hijack in addition to a schema hijack.
--   - REVOKE EXECUTE is explicit for PUBLIC *and* anon separately, even though
--     REVOKE ... FROM PUBLIC already covers anon transitively — this project has
--     already found one surprise default ACL granting anon/authenticated broad
--     table privileges (see 20260925093232_revoke_excess_grants.sql's header);
--     being explicit here costs nothing and doesn't rely on that not recurring
--     for functions too.
--
-- Beyond the two functions explicitly named in the original Apply plan
-- (approve_application, mark_order_paid), this adds two more of the same shape
-- for the same reason: create_application_order (order creation — a parent has
-- no INSERT grant on application_orders at all) and save_order_intake (the
-- Child's details step writes to application_orders.intake, which a parent also
-- has no UPDATE grant for). Both now explicitly approved.
--
-- Deviation from the sign-off text, flagged: "intake only while the order is
-- draft/awaiting_payment" was given as an example, but the actual built flow
-- (screen 7d, Child's details) happens AFTER checkout/payment, per
-- design/Application Help.dc.html's own screen order (7c Checkout precedes 7d).
-- Restricting to draft/awaiting_payment would make save_order_intake fail on
-- every real call the app makes. save_order_intake below uses an explicit
-- allow-list of (awaiting_payment, paid, in_progress) instead — draft is
-- included for completeness since it's a valid order_status value even though
-- nothing in this app currently creates a draft order; every terminal status
-- (completed, cancelled, refunded) is excluded. Flagging this prominently rather
-- than silently picking one interpretation.

CREATE OR REPLACE FUNCTION public.create_application_order(
  p_product_code text,
  p_child_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_price numeric(10,2);
  v_active boolean;
  v_order_id uuid;
  v_phone text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_product_code IS NULL OR length(trim(p_product_code)) = 0 OR p_child_id IS NULL THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM children WHERE id = p_child_id AND parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'child not found or not owned by caller';
  END IF;

  -- Price comes only from here — p_product_code is the only product-related
  -- argument this function accepts, so there is no amount for a caller to tamper.
  SELECT price_inr, active INTO v_price, v_active FROM products WHERE code = p_product_code;
  IF v_price IS NULL OR v_active IS NOT TRUE THEN
    RAISE EXCEPTION 'product % not found or inactive', p_product_code;
  END IF;

  INSERT INTO application_orders (user_id, child_id, product_code, amount_inr, status)
  VALUES (auth.uid(), p_child_id, p_product_code, v_price, 'awaiting_payment')
  RETURNING id INTO v_order_id;

  SELECT phone INTO v_phone FROM auth.users WHERE id = auth.uid();
  INSERT INTO consents (user_id, phone, purpose, notice_version, channel)
  VALUES (auth.uid(), v_phone, 'application_help', 'application-help-2026-09', 'app');

  RETURN v_order_id;
END;
$$;

-- Saves the Child's details step (7d) onto the order's own intake JSONB. See the
-- file header for why the allowed-status list is (awaiting_payment, paid,
-- in_progress) rather than the (draft, awaiting_payment) given as an example.
CREATE OR REPLACE FUNCTION public.save_order_intake(
  p_order_id uuid,
  p_intake jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  SELECT status INTO v_status FROM application_orders
  WHERE id = p_order_id AND user_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'order not found or not owned by caller';
  END IF;
  IF v_status NOT IN ('awaiting_payment', 'paid', 'in_progress') THEN
    RAISE EXCEPTION 'order is % — details can no longer be changed', v_status;
  END IF;

  UPDATE application_orders SET intake = coalesce(p_intake, '{}'::jsonb), updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Parent approval (7f "Review and approve"). "Nothing is submitted without your
-- OK" (per the design copy) is enforced by this being the ONLY path that can
-- move an application out of awaiting_parent_approval.
CREATE OR REPLACE FUNCTION public.approve_application(
  p_application_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status application_status;
  v_owned boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_application_id IS NULL THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  SELECT a.status, (o.user_id = auth.uid())
    INTO v_status, v_owned
  FROM applications a
  JOIN application_orders o ON o.id = a.order_id
  WHERE a.id = p_application_id;

  IF v_status IS NULL OR v_owned IS NOT TRUE THEN
    RAISE EXCEPTION 'application not found or not owned by caller';
  END IF;
  IF v_status <> 'awaiting_parent_approval' THEN
    RAISE EXCEPTION 'application is % — nothing to approve', v_status;
  END IF;

  UPDATE applications
  SET parent_approved_at = now(), status = 'submitted', updated_at = now()
  WHERE id = p_application_id;
END;
$$;

-- Payment confirmation. Idempotent (a retried webhook or a double staff-click is
-- a no-op, not an error) — only a genuinely unknown order_id raises. Intentionally
-- has NO auth.uid() ownership check: the caller here is never a parent's own
-- session, it's payments_service (via DATABASE_URL_PAYMENTS) or a staff action
-- already gated by is_staff() — see EXECUTE grant below (authenticated is
-- explicitly revoked, including staff; only payments_service can call this).
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  p_order_id uuid,
  p_payment_ref text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status order_status;
BEGIN
  IF p_order_id IS NULL OR p_payment_ref IS NULL OR length(trim(p_payment_ref)) = 0 THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  SELECT status INTO v_status FROM application_orders WHERE id = p_order_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'order % not found', p_order_id;
  END IF;
  IF v_status = 'paid' THEN
    RETURN;
  END IF;

  UPDATE application_orders
  SET status = 'paid', payment_ref = p_payment_ref, updated_at = now()
  WHERE id = p_order_id AND status = 'awaiting_payment';
END;
$$;

-- Retention purge (docs/data-retention.md). Deletes the Storage object and
-- soft-deletes the documents row for anything past retain_until. Not granted to
-- any app-facing role — run via `pnpm purge:documents`, which connects as the
-- migration-owning role (DATABASE_URL), same trust level as scripts/db-migrate.mjs.
CREATE OR REPLACE FUNCTION public.purge_expired_documents()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'documents'
    AND name IN (
      SELECT storage_path FROM documents
      WHERE retain_until < now() AND deleted_at IS NULL
    );

  WITH purged AS (
    UPDATE documents
    SET deleted_at = now()
    WHERE retain_until < now() AND deleted_at IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM purged;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_application_order(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_order_intake(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_application(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_order_paid(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_documents() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_application_order(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_order_intake(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) TO payments_service;
-- purge_expired_documents: no EXECUTE grant to any role — invoked only as
-- DATABASE_URL via pnpm purge:documents.
