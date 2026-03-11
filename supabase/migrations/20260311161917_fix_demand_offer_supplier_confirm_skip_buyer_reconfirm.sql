/*
  # Fix demand_offer Deal Flow: Supplier Confirm Should Skip awaiting_buyer

  ## Problem
  When a deal is created via `demand_offer` (buyer accepted supplier's offer),
  the buyer has ALREADY confirmed their intent. When the supplier then calls
  supplier_confirm_deal_v4, the deal incorrectly transitions to `awaiting_buyer`
  asking the buyer to confirm AGAIN — which the buyer doesn't expect.

  ## Correct Flow for demand_offer
  - buyer accepts offer → deal created (matched + demand_offer)
  - supplier confirms → inventory_reserved (skip awaiting_buyer, buyer already agreed)
  - supplier starts delivery → in_delivery

  ## Correct Flow for normal deals  
  - auto-match → deal created (matched)
  - supplier confirms → awaiting_buyer (buyer needs to confirm + set deadline)
  - buyer confirms → inventory_reserved
  - supplier starts delivery → in_delivery

  ## Fix
  Update supplier_confirm_deal_v4 to detect source='demand_offer' and:
  - Reserve inventory immediately
  - Transition directly to inventory_reserved
  - Set both supplier_confirmed_at AND buyer_confirmed_at (buyer already agreed)
*/

CREATE OR REPLACE FUNCTION supplier_confirm_deal_v4(
  p_deal_id       uuid,
  p_supplier_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal                   deals%ROWTYPE;
  v_commission_per_pallet  numeric;
  v_available              integer;
BEGIN
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصفقة غير موجودة');
  END IF;

  IF v_deal.supplier_phone != p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح لك بتأكيد هذه الصفقة');
  END IF;

  IF v_deal.status NOT IN ('pending_confirmation', 'matched', 'pending_supplier') THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن تأكيد صفقة بحالة: ' || v_deal.status);
  END IF;

  SELECT (setting_value::text)::numeric INTO v_commission_per_pallet
  FROM platform_settings
  WHERE group_key = 'pricing' AND setting_key = 'platform_commission_per_pallet';

  IF v_commission_per_pallet IS NULL THEN
    v_commission_per_pallet := 0.25;
  END IF;

  IF v_deal.source = 'demand_offer' THEN
    -- Buyer already agreed when they accepted the offer.
    -- Reserve inventory and go directly to inventory_reserved.
    IF v_deal.inventory_batch_id IS NOT NULL THEN
      SELECT available_quantity INTO v_available
      FROM inventory_batches
      WHERE id = v_deal.inventory_batch_id;

      IF v_available IS NOT NULL AND v_available >= v_deal.quantity THEN
        UPDATE inventory_batches SET
          available_quantity = available_quantity - v_deal.quantity,
          reserved_quantity  = reserved_quantity  + v_deal.quantity,
          updated_at         = now()
        WHERE id = v_deal.inventory_batch_id;
      END IF;
    END IF;

    IF v_deal.supplier_price IS NULL OR v_deal.platform_fee IS NULL THEN
      UPDATE deals SET
        status                  = 'inventory_reserved',
        supplier_confirmed_at   = now(),
        buyer_confirmed_at      = COALESCE(buyer_confirmed_at, now()),
        reserved_at             = now(),
        supplier_price          = v_deal.final_price,
        platform_fee_per_pallet = v_commission_per_pallet,
        platform_fee            = v_deal.quantity * v_commission_per_pallet,
        buyer_price             = v_deal.final_price + v_commission_per_pallet,
        updated_at              = now()
      WHERE id = p_deal_id;
    ELSE
      UPDATE deals SET
        status                = 'inventory_reserved',
        supplier_confirmed_at = now(),
        buyer_confirmed_at    = COALESCE(buyer_confirmed_at, now()),
        reserved_at           = now(),
        updated_at            = now()
      WHERE id = p_deal_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'next_step', 'start_delivery');
  ELSE
    -- Normal flow: go to awaiting_buyer so buyer can confirm + set deadline
    IF v_deal.supplier_price IS NULL OR v_deal.platform_fee IS NULL THEN
      UPDATE deals SET
        status                  = 'awaiting_buyer',
        supplier_confirmed_at   = now(),
        supplier_price          = v_deal.final_price,
        platform_fee_per_pallet = v_commission_per_pallet,
        platform_fee            = v_deal.quantity * v_commission_per_pallet,
        buyer_price             = v_deal.final_price + v_commission_per_pallet,
        updated_at              = now()
      WHERE id = p_deal_id;
    ELSE
      UPDATE deals SET
        status                = 'awaiting_buyer',
        supplier_confirmed_at = now(),
        updated_at            = now()
      WHERE id = p_deal_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'next_step', 'await_buyer');
  END IF;
END;
$$;
