/*
  # Fix create_invoice_for_deal - Show Platform Commission in All Invoices

  ## Problem
  Invoices generated for deals did not explicitly show the platform commission
  as a line item. For buyer invoices, commission was stored in platform_fee
  column but not shown in invoice_items. For supplier invoices only commission
  total was shown.

  ## Fix
  - buyer_invoice: Show pallet subtotal + explicit commission line item
  - supplier_invoice: Show pallet subtotal + explicit commission line item
  - Both invoice types now read commission from admin_settings.platform_fee_per_unit
  - invoice_items now include a dedicated commission row with per-pallet rate
  - platform_fee column is populated with the actual commission amount
  - total_amount reflects the full deal amount (buyer price or supplier price)
*/

CREATE OR REPLACE FUNCTION create_invoice_for_deal(
  p_deal_id uuid,
  p_invoice_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal record;
  v_invoice_id uuid;
  v_invoice_number text;
  v_settings record;
  v_subtotal numeric;
  v_platform_fee numeric;
  v_commission_per_pallet numeric;
  v_total numeric;
  v_items jsonb;
  v_due_date timestamptz;
BEGIN
  SELECT
    d.*,
    ib.pallet_type,
    ib.size as pallet_size,
    ib.quality as quality_grade,
    ib.pallet_condition,
    ib.price_per_pallet,
    o.city as buyer_city
  INTO v_deal
  FROM deals d
  JOIN inventory_batches ib ON ib.id = d.inventory_batch_id
  LEFT JOIN orders o ON o.id = d.order_id
  WHERE d.id = p_deal_id;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Deal not found');
  END IF;

  SELECT * INTO v_settings FROM invoice_settings LIMIT 1;

  v_invoice_number := generate_invoice_number();

  v_due_date := now() + (COALESCE(v_settings.payment_terms_days, 30) || ' days')::interval;

  -- Read platform commission from admin_settings (single source of truth)
  SELECT COALESCE(platform_fee_per_unit, 1.0)
  INTO v_commission_per_pallet
  FROM admin_settings
  LIMIT 1;

  IF v_commission_per_pallet IS NULL THEN
    v_commission_per_pallet := 1.0;
  END IF;

  -- Use stored platform_fee from deal if available, else calculate
  v_platform_fee := COALESCE(v_deal.platform_fee, v_commission_per_pallet * GREATEST(v_deal.quantity, 1));

  IF p_invoice_type = 'buyer_invoice' THEN
    v_subtotal := COALESCE(v_deal.buyer_price, 0);
    v_total := v_subtotal;

    v_items := jsonb_build_array(
      jsonb_build_object(
        'description', COALESCE(v_deal.pallet_type, '') || ' - ' || COALESCE(v_deal.pallet_size, '') || ' - ' || COALESCE(v_deal.quality_grade, ''),
        'quantity', v_deal.quantity,
        'unit_price', COALESCE(v_deal.price_per_pallet, 0),
        'total', v_subtotal,
        'type', 'pallets'
      ),
      jsonb_build_object(
        'description', 'عمولة المنصة (' || v_commission_per_pallet || ' ريال × ' || v_deal.quantity || ' طبلية)',
        'quantity', v_deal.quantity,
        'unit_price', v_commission_per_pallet,
        'total', v_platform_fee,
        'type', 'commission'
      )
    );

  ELSIF p_invoice_type = 'supplier_invoice' THEN
    v_subtotal := COALESCE(v_deal.supplier_price, 0);
    v_total := v_subtotal;

    v_items := jsonb_build_array(
      jsonb_build_object(
        'description', COALESCE(v_deal.pallet_type, '') || ' - ' || COALESCE(v_deal.pallet_size, '') || ' - ' || COALESCE(v_deal.quality_grade, ''),
        'quantity', v_deal.quantity,
        'unit_price', COALESCE(v_deal.price_per_pallet, 0),
        'total', v_subtotal,
        'type', 'pallets'
      ),
      jsonb_build_object(
        'description', 'عمولة المنصة (' || v_commission_per_pallet || ' ريال × ' || v_deal.quantity || ' طبلية)',
        'quantity', v_deal.quantity,
        'unit_price', v_commission_per_pallet,
        'total', v_platform_fee,
        'type', 'commission'
      )
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Invalid invoice type');
  END IF;

  INSERT INTO invoices (
    invoice_number,
    deal_id,
    buyer_phone,
    supplier_phone,
    invoice_type,
    invoice_date,
    due_date,
    subtotal,
    platform_fee,
    total_amount,
    status,
    invoice_items,
    notes
  ) VALUES (
    v_invoice_number,
    p_deal_id,
    v_deal.buyer_phone,
    v_deal.supplier_phone,
    p_invoice_type,
    now(),
    v_due_date,
    v_subtotal,
    v_platform_fee,
    v_total,
    'draft',
    v_items,
    CASE
      WHEN p_invoice_type = 'buyer_invoice' THEN 'فاتورة شراء طبليات - تشمل عمولة المنصة'
      WHEN p_invoice_type = 'supplier_invoice' THEN 'فاتورة مورد - تشمل عمولة المنصة'
    END
  )
  RETURNING id INTO v_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'platform_fee', v_platform_fee,
    'commission_per_pallet', v_commission_per_pallet
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_invoice_for_deal(uuid, text) TO authenticated, anon;
