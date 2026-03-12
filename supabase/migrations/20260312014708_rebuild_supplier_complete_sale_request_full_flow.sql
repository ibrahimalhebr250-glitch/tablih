/*
  # Rebuild supplier_complete_sale_request - Complete 8-Step Flow

  This migration rebuilds the supplier_complete_sale_request function to execute
  all required steps when a supplier presses "تم التسليم" (Delivery Complete):

  1. Deduct sold quantity from supplier's inventory_batches (quantity_available & available_quantity)
  2. Add same quantity to buyer_inventory with inventory_source = 'purchase_transfer'
  3. Record platform commission in commission_settlements as 'pending'
  4. Update sale_request status to 'completed'
  5. Hide inventory card from market if quantity reaches 0, otherwise update visible quantity
  6. Log the full operation in inventory_operations_log
  7. Buyer sees new stock in cloud warehouse / supplier sees reduced stock
  8. Operation is sealed - only admin can modify

  Also adds buyer_phone column to commission_settlements for full traceability.
*/

-- Add buyer_phone to commission_settlements if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_settlements' AND column_name = 'buyer_phone'
  ) THEN
    ALTER TABLE commission_settlements ADD COLUMN buyer_phone text;
  END IF;
END $$;

-- Add total_commission to commission_settlements if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_settlements' AND column_name = 'total_commission'
  ) THEN
    ALTER TABLE commission_settlements ADD COLUMN total_commission numeric DEFAULT 0;
  END IF;
END $$;

-- Add deal_reference to commission_settlements if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_settlements' AND column_name = 'deal_reference'
  ) THEN
    ALTER TABLE commission_settlements ADD COLUMN deal_reference text;
  END IF;
END $$;

-- Rebuild the complete function
CREATE OR REPLACE FUNCTION supplier_complete_sale_request(
  p_session_token text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phone text;
  v_req record;
  v_batch record;
  v_qty_before integer;
  v_qty_after integer;
  v_total_commission numeric;
BEGIN
  -- Resolve supplier session
  v_phone := resolve_session_phone(p_session_token);
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة');
  END IF;

  -- Load sale request and verify ownership
  SELECT * INTO v_req
  FROM sale_requests
  WHERE id = p_request_id AND supplier_phone = v_phone;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود أو لا تملك صلاحية الوصول إليه');
  END IF;

  IF v_req.status <> 'in_contact' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إتمام التسليم إلا بعد بدء التواصل مع المشتري');
  END IF;

  -- Load inventory batch
  SELECT * INTO v_batch
  FROM inventory_batches
  WHERE id = v_req.inventory_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزون المرتبط بهذا الطلب غير موجود');
  END IF;

  -- Check sufficient quantity
  v_qty_before := COALESCE(v_batch.quantity_available, v_batch.available_quantity, 0);
  IF v_qty_before < v_req.requested_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الكمية المتاحة في المخزون (' || v_qty_before || ') أقل من الكمية المطلوبة (' || v_req.requested_quantity || ')'
    );
  END IF;

  v_qty_after := v_qty_before - v_req.requested_quantity;

  -- ================================================================
  -- STEP 1: Deduct from supplier inventory
  -- ================================================================
  UPDATE inventory_batches
  SET
    quantity_available = GREATEST(0, COALESCE(quantity_available, 0) - v_req.requested_quantity),
    available_quantity = GREATEST(0, COALESCE(available_quantity, 0) - v_req.requested_quantity),
    -- Step 5: Hide from market if quantity reaches 0
    publish_to_market = CASE
      WHEN GREATEST(0, COALESCE(quantity_available, 0) - v_req.requested_quantity) = 0 THEN false
      ELSE publish_to_market
    END,
    status = CASE
      WHEN GREATEST(0, COALESCE(quantity_available, 0) - v_req.requested_quantity) = 0 THEN 'sold_out'
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_req.inventory_batch_id;

  -- ================================================================
  -- STEP 2: Add to buyer's cloud warehouse
  -- ================================================================
  INSERT INTO buyer_inventory (
    buyer_phone,
    original_deal_id,
    pallet_type,
    size,
    quality,
    condition,
    city,
    quantity,
    quantity_available,
    unit_price,
    total_paid,
    original_supplier_phone,
    inventory_source,
    images,
    description,
    acquired_at
  ) VALUES (
    v_req.buyer_phone,
    NULL,
    v_req.pallet_type,
    v_req.size,
    v_req.quality,
    COALESCE(v_batch.pallet_condition, 'used'),
    v_req.city,
    v_req.requested_quantity,
    v_req.requested_quantity,
    v_req.price_per_pallet,
    v_req.price_per_pallet * v_req.requested_quantity,
    v_req.supplier_phone,
    'purchase_transfer',
    COALESCE(
      (SELECT jsonb_build_array(image_url) FROM inventory_batches WHERE id = v_req.inventory_batch_id AND image_url IS NOT NULL),
      '[]'::jsonb
    ),
    COALESCE(v_batch.description, ''),
    now()
  );

  -- ================================================================
  -- STEP 3: Record platform commission as pending
  -- ================================================================
  v_total_commission := v_req.commission_per_pallet * v_req.requested_quantity;

  INSERT INTO commission_settlements (
    supplier_phone,
    buyer_phone,
    deal_id,
    pallet_count,
    commission_amount,
    total_commission,
    deal_reference,
    status,
    notes,
    settled_at
  ) VALUES (
    v_req.supplier_phone,
    v_req.buyer_phone,
    NULL,
    v_req.requested_quantity,
    v_req.commission_per_pallet,
    v_total_commission,
    'sale_request:' || p_request_id::text,
    'pending',
    'عمولة معلقة - طلب بيع مباشر #' || p_request_id::text,
    NULL
  );

  -- ================================================================
  -- STEP 4: Mark sale request as completed
  -- ================================================================
  UPDATE sale_requests
  SET
    status = 'completed',
    updated_at = now()
  WHERE id = p_request_id;

  -- ================================================================
  -- STEP 6: Log operation in inventory_operations_log
  -- ================================================================
  INSERT INTO inventory_operations_log (
    batch_id,
    operation_type,
    performed_by,
    performed_by_type,
    supplier_phone,
    city,
    pallet_type,
    pallet_size,
    quantity_affected,
    quantity_before,
    quantity_after,
    price_before,
    price_after,
    reason,
    notes,
    metadata
  ) VALUES (
    v_req.inventory_batch_id,
    'sale_request_completed',
    v_phone,
    'supplier',
    v_req.supplier_phone,
    v_req.city,
    v_req.pallet_type,
    v_req.size,
    v_req.requested_quantity,
    v_qty_before,
    v_qty_after,
    v_batch.price_per_pallet,
    v_batch.price_per_pallet,
    'إتمام بيع مباشر عبر طلب بيع',
    'تم نقل ' || v_req.requested_quantity || ' طبليات إلى المشتري ' || v_req.buyer_phone,
    jsonb_build_object(
      'sale_request_id', p_request_id,
      'buyer_phone', v_req.buyer_phone,
      'price_per_pallet', v_req.price_per_pallet,
      'total_amount', v_req.price_per_pallet * v_req.requested_quantity,
      'commission_per_pallet', v_req.commission_per_pallet,
      'total_commission', v_total_commission,
      'inventory_hidden', v_qty_after = 0
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إتمام التسليم بنجاح',
    'details', jsonb_build_object(
      'quantity_transferred', v_req.requested_quantity,
      'quantity_remaining', v_qty_after,
      'inventory_hidden', v_qty_after = 0,
      'commission_recorded', v_total_commission,
      'buyer_inventory_updated', true
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'حدث خطأ أثناء إتمام العملية: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION supplier_complete_sale_request(text, uuid) TO authenticated, anon;
