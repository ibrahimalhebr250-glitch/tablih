/*
  # Fix create_invoice_for_deal - platform_commission field does not exist

  1. Problem
    - Function references `v_deal.platform_commission` but the deals table column is `platform_fee`

  2. Changes
    - Replace all references to `platform_commission` with `platform_fee`
*/

CREATE OR REPLACE FUNCTION create_invoice_for_deal(
  p_deal_id uuid,
  p_invoice_type text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal record;
  v_invoice_id uuid;
  v_invoice_number text;
  v_settings record;
  v_subtotal numeric;
  v_platform_fee numeric;
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

  IF p_invoice_type = 'buyer_invoice' THEN
    v_subtotal := v_deal.buyer_price;
    v_platform_fee := COALESCE(v_deal.platform_fee, 0);
    v_total := v_deal.buyer_price;

    v_items := jsonb_build_array(
      jsonb_build_object(
        'description', v_deal.pallet_type || ' - ' || v_deal.pallet_size || ' - ' || v_deal.quality_grade,
        'quantity', v_deal.quantity,
        'unit_price', v_deal.price_per_pallet,
        'total', v_deal.buyer_price
      )
    );

  ELSIF p_invoice_type = 'supplier_invoice' THEN
    v_subtotal := v_deal.supplier_price;
    v_platform_fee := COALESCE(v_deal.platform_fee, 0);
    v_total := v_deal.supplier_price;

    v_items := jsonb_build_array(
      jsonb_build_object(
        'description', 'عمولة المنصة للصفقة #' || p_deal_id,
        'quantity', v_deal.quantity,
        'unit_price', COALESCE(v_deal.platform_fee, 0) / GREATEST(v_deal.quantity, 1),
        'total', COALESCE(v_deal.platform_fee, 0)
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
  )
  VALUES (
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
      WHEN p_invoice_type = 'buyer_invoice' THEN 'فاتورة شراء طبليات'
      WHEN p_invoice_type = 'supplier_invoice' THEN 'فاتورة عمولة المنصة'
    END
  )
  RETURNING id INTO v_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number
  );
END;
$$;
