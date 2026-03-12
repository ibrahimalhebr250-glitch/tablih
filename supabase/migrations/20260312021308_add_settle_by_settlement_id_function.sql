/*
  # Add settle_commission_by_id Function

  Allows settling a commission_settlement record directly by its ID
  (used for sale_request commissions that have no deal_id).

  - New function: settle_commission_by_id(p_settlement_id, p_method, p_staff)
  - Updates commission_settlements.status to 'settled'
  - Sets settlement_method, settled_by, settled_at
*/

CREATE OR REPLACE FUNCTION settle_commission_by_id(
  p_settlement_id uuid,
  p_method text DEFAULT 'bank_transfer',
  p_staff text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE commission_settlements
  SET
    status = 'settled',
    settlement_method = p_method,
    settled_by = p_staff,
    settled_at = now(),
    updated_at = now()
  WHERE id = p_settlement_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'السجل غير موجود أو تم تسويته مسبقاً');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION settle_commission_by_id(uuid, text, text) TO authenticated, anon;
