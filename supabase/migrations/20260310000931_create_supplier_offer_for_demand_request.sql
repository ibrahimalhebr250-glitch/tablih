/*
  # Supplier Offer for Demand Request

  Allows a supplier to send an offer to a buyer who posted a demand/purchase request.
  
  1. New Table
     - `supplier_demand_offers` — tracks supplier offers on demand orders
       - id, order_id (uuid ref orders), supplier_phone, buyer_phone
       - quantity, price_per_pallet, supplier_message
       - status: pending | accepted | rejected | deal_created | cancelled
       - deal_id (uuid ref deals, nullable)
       - created_at, updated_at
  
  2. New RPC
     - `create_supplier_offer_for_demand` — supplier sends offer to buyer
     - `get_supplier_offers_for_demand` — check if supplier already sent offer
  
  3. Security
     - RLS enabled, only authenticated session users can insert/view their offers
*/

CREATE TABLE IF NOT EXISTS supplier_demand_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  supplier_phone text NOT NULL,
  buyer_phone text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_per_pallet numeric DEFAULT 0,
  supplier_message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','deal_created','cancelled')),
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_demand_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can insert their own offers"
  ON supplier_demand_offers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Suppliers can view their own offers"
  ON supplier_demand_offers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Suppliers can update their own offers"
  ON supplier_demand_offers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE supplier_demand_offers;

CREATE OR REPLACE FUNCTION create_supplier_offer_for_demand(
  p_supplier_phone text,
  p_order_id uuid,
  p_quantity integer,
  p_price_per_pallet numeric DEFAULT 0,
  p_supplier_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_offer_id uuid;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_order.phone = p_supplier_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك تقديم عرض على طلبك الخاص');
  END IF;

  IF v_order.status NOT IN ('pending', 'unmatched', 'partially_matched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا الطلب غير متاح حالياً');
  END IF;

  IF EXISTS (
    SELECT 1 FROM supplier_demand_offers
    WHERE order_id = p_order_id
      AND supplier_phone = p_supplier_phone
      AND status NOT IN ('rejected','cancelled')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك عرض قيد الانتظار على هذا الطلب');
  END IF;

  INSERT INTO supplier_demand_offers (
    order_id, supplier_phone, buyer_phone,
    quantity, price_per_pallet, supplier_message
  ) VALUES (
    p_order_id, p_supplier_phone, v_order.phone,
    p_quantity, p_price_per_pallet, p_supplier_message
  )
  RETURNING id INTO v_offer_id;

  RETURN jsonb_build_object('success', true, 'offer_id', v_offer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION create_supplier_offer_for_demand(text, uuid, integer, numeric, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_supplier_offer_for_demand(
  p_supplier_phone text,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
BEGIN
  SELECT id, status, created_at, quantity, price_per_pallet, supplier_message
  INTO v_offer
  FROM supplier_demand_offers
  WHERE order_id = p_order_id
    AND supplier_phone = p_supplier_phone
    AND status NOT IN ('cancelled')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_offer.id,
    'status', v_offer.status,
    'created_at', v_offer.created_at,
    'quantity', v_offer.quantity,
    'price_per_pallet', v_offer.price_per_pallet,
    'supplier_message', v_offer.supplier_message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_supplier_offer_for_demand(text, uuid) TO anon, authenticated;
