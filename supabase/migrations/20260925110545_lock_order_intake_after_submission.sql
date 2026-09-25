-- Locks save_order_intake once any application under the order has moved past
-- awaiting_parent_approval — "submitted or later" (submitted, fee_pending,
-- interview_scheduled, result_selected, result_waitlisted, result_not_selected,
-- withdrawn all count; not_started/preparing/awaiting_parent_approval don't).
-- After that point, a parent editing their address or category could silently
-- desync from what a school already has on file — edits from here go through
-- staff instead. CREATE OR REPLACE on an already-applied function, not a
-- destructive op — same authority as the original function definition.

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
  v_locked boolean;
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

  SELECT EXISTS (
    SELECT 1 FROM applications
    WHERE order_id = p_order_id
      AND status NOT IN ('not_started', 'preparing', 'awaiting_parent_approval')
  ) INTO v_locked;
  IF v_locked THEN
    RAISE EXCEPTION 'an application for this order has already been submitted — contact us to change details';
  END IF;

  UPDATE application_orders SET intake = coalesce(p_intake, '{}'::jsonb), updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Ownership + grants are unchanged from 20260925102636_application_help_functions.sql
-- (EXECUTE stays authenticated-only; REVOKE FROM PUBLIC, anon stays in force since
-- CREATE OR REPLACE does not reset a function's existing ACL).
