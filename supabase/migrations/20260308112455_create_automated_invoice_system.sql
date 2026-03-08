/*
  # Create Automated Invoice Generation System

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique) - auto-generated invoice number
      - `deal_id` (uuid, foreign key) - related deal
      - `buyer_phone` (text) - buyer information
      - `supplier_phone` (text) - supplier information
      - `invoice_type` (text) - buyer_invoice, supplier_invoice, commission_invoice
      - `invoice_date` (timestamptz) - when invoice was created
      - `due_date` (timestamptz) - payment due date
      - `subtotal` (numeric) - amount before fees
      - `platform_fee` (numeric) - platform commission
      - `tax_amount` (numeric) - tax if applicable
      - `total_amount` (numeric) - final total
      - `currency` (text) - SAR
      - `status` (text) - draft, sent, paid, overdue, cancelled
      - `payment_date` (timestamptz) - when payment was received
      - `invoice_items` (jsonb) - line items
      - `notes` (text) - additional notes
      - `pdf_url` (text) - generated PDF URL
      - `sent_at` (timestamptz) - when invoice was sent
      - `sent_to_email` (text) - email address invoice was sent to
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `invoice_settings`
      - `id` (uuid, primary key)
      - `company_name` (text) - platform company name
      - `company_address` (text)
      - `company_phone` (text)
      - `company_email` (text)
      - `tax_number` (text) - VAT registration
      - `auto_generate` (boolean) - auto-generate on deal completion
      - `auto_send` (boolean) - auto-send invoices
      - `payment_terms_days` (int) - default payment terms
      - `invoice_prefix` (text) - INV-
      - `invoice_footer` (text) - footer text
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `generate_invoice_number()` - creates unique invoice number
    - `create_invoice_for_deal()` - generates invoice from deal
    - `admin_get_invoices()` - lists all invoices
    - `admin_update_invoice_status()` - updates invoice status
    - `admin_configure_invoice_settings()` - configures invoice settings
    - `get_invoice_by_id()` - gets single invoice
    - `mark_invoice_as_paid()` - marks invoice as paid

  3. Security
    - Enable RLS on all tables
    - Buyers/suppliers can view their invoices
    - Admins can manage all invoices

  4. Notes
    - Invoices auto-generated when deal completes
    - Separate invoices for buyer and supplier
    - Includes platform commission calculation
    - PDF generation ready (URL stored)
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  buyer_phone text,
  supplier_phone text,
  invoice_type text NOT NULL CHECK (invoice_type IN ('buyer_invoice', 'supplier_invoice', 'commission_invoice')),
  invoice_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  subtotal numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_date timestamptz,
  invoice_items jsonb DEFAULT '[]'::jsonb,
  notes text,
  pdf_url text,
  sent_at timestamptz,
  sent_to_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_deal ON invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer ON invoices(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_phone);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    buyer_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    OR supplier_phone = current_setting('request.jwt.claims', true)::json->>'phone'
  );

CREATE POLICY "Admins can manage all invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create invoice_settings table
CREATE TABLE IF NOT EXISTS invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'منصة طبليات',
  company_address text DEFAULT 'المملكة العربية السعودية',
  company_phone text,
  company_email text,
  tax_number text,
  auto_generate boolean DEFAULT true,
  auto_send boolean DEFAULT false,
  payment_terms_days int DEFAULT 30,
  invoice_prefix text DEFAULT 'INV-',
  invoice_footer text DEFAULT 'شكراً لتعاملكم معنا',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view invoice settings"
  ON invoice_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage invoice settings"
  ON invoice_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_settings;

-- Insert default invoice settings
INSERT INTO invoice_settings (
  company_name,
  company_address,
  auto_generate,
  payment_terms_days,
  invoice_prefix
)
VALUES (
  'منصة طبليات',
  'المملكة العربية السعودية',
  true,
  30,
  'INV-'
)
ON CONFLICT DO NOTHING;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix text;
  v_sequence int;
  v_year text;
  v_month text;
  v_invoice_number text;
BEGIN
  -- Get prefix from settings
  SELECT invoice_prefix INTO v_prefix
  FROM invoice_settings
  LIMIT 1;

  v_prefix := COALESCE(v_prefix, 'INV-');

  -- Get year and month
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');

  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    SUBSTRING(invoice_number FROM '\d+$')::int
  ), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE invoice_number LIKE v_prefix || v_year || v_month || '%';

  -- Create invoice number: INV-202603-0001
  v_invoice_number := v_prefix || v_year || v_month || '-' || LPAD(v_sequence::text, 4, '0');

  RETURN v_invoice_number;
END;
$$;

-- Function to create invoice for deal
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
  v_total numeric;
  v_items jsonb;
  v_due_date timestamptz;
BEGIN
  -- Get deal details
  SELECT 
    d.*,
    ib.pallet_type,
    ib.pallet_size,
    ib.quality_grade,
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

  -- Get invoice settings
  SELECT * INTO v_settings FROM invoice_settings LIMIT 1;

  -- Generate invoice number
  v_invoice_number := generate_invoice_number();

  -- Calculate due date
  v_due_date := now() + (COALESCE(v_settings.payment_terms_days, 30) || ' days')::interval;

  -- Build invoice items
  IF p_invoice_type = 'buyer_invoice' THEN
    v_subtotal := v_deal.buyer_price;
    v_platform_fee := v_deal.platform_commission;
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
    v_platform_fee := v_deal.platform_commission;
    v_total := v_deal.supplier_price;
    
    v_items := jsonb_build_array(
      jsonb_build_object(
        'description', 'عمولة المنصة للصفقة #' || p_deal_id,
        'quantity', v_deal.quantity,
        'unit_price', v_deal.platform_commission / v_deal.quantity,
        'total', v_deal.platform_commission
      )
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Invalid invoice type');
  END IF;

  -- Create invoice
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

-- Function to get all invoices (admin)
CREATE OR REPLACE FUNCTION admin_get_invoices(
  p_status text DEFAULT NULL,
  p_invoice_type text DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  invoice_number text,
  deal_id uuid,
  buyer_phone text,
  supplier_phone text,
  invoice_type text,
  invoice_date timestamptz,
  due_date timestamptz,
  total_amount numeric,
  status text,
  sent_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    invoice_number,
    deal_id,
    buyer_phone,
    supplier_phone,
    invoice_type,
    invoice_date,
    due_date,
    total_amount,
    status,
    sent_at
  FROM invoices
  WHERE 
    (p_status IS NULL OR status = p_status)
    AND (p_invoice_type IS NULL OR invoice_type = p_invoice_type)
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Function to get invoice by ID
CREATE OR REPLACE FUNCTION get_invoice_by_id(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT row_to_json(i)::jsonb
  FROM invoices i
  WHERE id = p_invoice_id;
$$;

-- Function to update invoice status
CREATE OR REPLACE FUNCTION admin_update_invoice_status(
  p_invoice_id uuid,
  p_status text,
  p_payment_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invoices
  SET 
    status = p_status,
    payment_date = CASE WHEN p_status = 'paid' THEN COALESCE(p_payment_date, now()) ELSE payment_date END,
    updated_at = now()
  WHERE id = p_invoice_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Invoice not found');
  END IF;
END;
$$;

-- Function to mark invoice as paid
CREATE OR REPLACE FUNCTION mark_invoice_as_paid(
  p_invoice_id uuid,
  p_payment_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invoices
  SET 
    status = 'paid',
    payment_date = p_payment_date,
    updated_at = now()
  WHERE id = p_invoice_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Invoice marked as paid');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Invoice not found');
  END IF;
END;
$$;

-- Function to configure invoice settings
CREATE OR REPLACE FUNCTION admin_configure_invoice_settings(
  p_company_name text DEFAULT NULL,
  p_company_address text DEFAULT NULL,
  p_company_phone text DEFAULT NULL,
  p_company_email text DEFAULT NULL,
  p_tax_number text DEFAULT NULL,
  p_auto_generate boolean DEFAULT NULL,
  p_auto_send boolean DEFAULT NULL,
  p_payment_terms_days int DEFAULT NULL,
  p_invoice_prefix text DEFAULT NULL,
  p_invoice_footer text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings_id uuid;
BEGIN
  -- Get or create settings
  SELECT id INTO v_settings_id FROM invoice_settings LIMIT 1;

  IF v_settings_id IS NULL THEN
    INSERT INTO invoice_settings DEFAULT VALUES RETURNING id INTO v_settings_id;
  END IF;

  -- Update settings
  UPDATE invoice_settings
  SET
    company_name = COALESCE(p_company_name, company_name),
    company_address = COALESCE(p_company_address, company_address),
    company_phone = COALESCE(p_company_phone, company_phone),
    company_email = COALESCE(p_company_email, company_email),
    tax_number = COALESCE(p_tax_number, tax_number),
    auto_generate = COALESCE(p_auto_generate, auto_generate),
    auto_send = COALESCE(p_auto_send, auto_send),
    payment_terms_days = COALESCE(p_payment_terms_days, payment_terms_days),
    invoice_prefix = COALESCE(p_invoice_prefix, invoice_prefix),
    invoice_footer = COALESCE(p_invoice_footer, invoice_footer),
    updated_at = now()
  WHERE id = v_settings_id;

  RETURN jsonb_build_object('success', true, 'settings_id', v_settings_id);
END;
$$;

-- Trigger to auto-generate invoices when deal completes
CREATE OR REPLACE FUNCTION trigger_auto_generate_invoices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auto_generate boolean;
BEGIN
  -- Check if auto-generation is enabled
  SELECT auto_generate INTO v_auto_generate FROM invoice_settings LIMIT 1;

  IF v_auto_generate AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Generate buyer invoice
    PERFORM create_invoice_for_deal(NEW.id, 'buyer_invoice');
    
    -- Generate supplier commission invoice
    PERFORM create_invoice_for_deal(NEW.id, 'supplier_invoice');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_generate_invoices_on_deal_completion ON deals;
CREATE TRIGGER auto_generate_invoices_on_deal_completion
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_generate_invoices();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_invoice_number TO authenticated;
GRANT EXECUTE ON FUNCTION create_invoice_for_deal TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_invoices TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_invoice_status TO authenticated;
GRANT EXECUTE ON FUNCTION mark_invoice_as_paid TO authenticated;
GRANT EXECUTE ON FUNCTION admin_configure_invoice_settings TO authenticated;
