
/*
  # Restore admin_configure_invoice_settings function
  Called from useInvoiceSystem.ts hook.
*/
CREATE OR REPLACE FUNCTION admin_configure_invoice_settings(
  p_company_name text DEFAULT NULL,
  p_company_address text DEFAULT NULL,
  p_company_phone text DEFAULT NULL,
  p_company_email text DEFAULT NULL,
  p_tax_number text DEFAULT NULL,
  p_auto_generate boolean DEFAULT NULL,
  p_auto_send boolean DEFAULT NULL,
  p_payment_terms_days integer DEFAULT NULL,
  p_invoice_prefix text DEFAULT NULL,
  p_invoice_footer text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invoice_settings SET
    company_name    = COALESCE(p_company_name, company_name),
    company_address = COALESCE(p_company_address, company_address),
    company_phone   = COALESCE(p_company_phone, company_phone),
    company_email   = COALESCE(p_company_email, company_email),
    tax_number      = COALESCE(p_tax_number, tax_number),
    auto_generate   = COALESCE(p_auto_generate, auto_generate),
    auto_send       = COALESCE(p_auto_send, auto_send),
    payment_terms_days = COALESCE(p_payment_terms_days, payment_terms_days),
    invoice_prefix  = COALESCE(p_invoice_prefix, invoice_prefix),
    invoice_footer  = COALESCE(p_invoice_footer, invoice_footer),
    updated_at      = now();

  IF NOT FOUND THEN
    INSERT INTO invoice_settings (company_name, company_address, company_phone, company_email,
      tax_number, auto_generate, auto_send, payment_terms_days, invoice_prefix, invoice_footer)
    VALUES (p_company_name, p_company_address, p_company_phone, p_company_email,
      p_tax_number, COALESCE(p_auto_generate, false), COALESCE(p_auto_send, false),
      COALESCE(p_payment_terms_days, 30), COALESCE(p_invoice_prefix, 'INV'), p_invoice_footer);
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_configure_invoice_settings(text,text,text,text,text,boolean,boolean,integer,text,text) TO anon, authenticated;
