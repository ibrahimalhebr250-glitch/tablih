/*
  # Add "Sold Reserved" Label for Deals in Delivery
  
  ## Summary
  Adds visual distinction for deals that are reserved for sale (in_delivery or completed).
  
  ## Changes
  1. No new columns needed - we'll use existing status field
  2. When status = 'in_delivery' → display as "محجوز بيع" (Reserved for Sale)
  3. When status = 'inventory_reserved' → display as "محجوز" (Reserved)
  4. When status = 'completed' → display as "مكتمل" (Completed)
  
  ## Business Logic
  - inventory_reserved: Buyer confirmed but supplier hasn't started delivery yet → "محجوز"
  - in_delivery: Supplier started delivery, items sold but not yet delivered → "محجوز بيع"
  - completed: Delivery confirmed, items transferred to buyer → "مكتمل"
  
  ## Display Labels
  This migration adds a helper function to get the Arabic label for deal status.
*/

-- Create helper function to get Arabic status label
CREATE OR REPLACE FUNCTION get_deal_status_label(p_status text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_status
    WHEN 'matched' THEN 'متطابق'
    WHEN 'supplier_confirmed' THEN 'تأكيد المورد'
    WHEN 'awaiting_buyer' THEN 'في انتظار المشتري'
    WHEN 'inventory_reserved' THEN 'محجوز'
    WHEN 'in_delivery' THEN 'محجوز بيع'
    WHEN 'completed' THEN 'مكتمل'
    WHEN 'cancelled' THEN 'ملغي'
    WHEN 'pending_confirmation' THEN 'في انتظار التأكيد'
    WHEN 'buyer_confirmed' THEN 'تأكيد المشتري'
    WHEN 'awaiting_payment' THEN 'في انتظار الدفع'
    WHEN 'paid' THEN 'مدفوع'
    WHEN 'supplier_notified' THEN 'تم إشعار المورد'
    WHEN 'preparing' THEN 'جاري التحضير'
    WHEN 'delivered' THEN 'تم التسليم'
    WHEN 'settlement_pending' THEN 'في انتظار التسوية'
    WHEN 'supplier_settled' THEN 'تمت التسوية'
    WHEN 'active' THEN 'نشط'
    WHEN 'pending_receipt' THEN 'في انتظار الاستلام'
    ELSE p_status
  END;
END;
$$;

-- Create view for deals with status labels
CREATE OR REPLACE VIEW deals_with_labels AS
SELECT
  d.*,
  get_deal_status_label(d.status) as status_label,
  CASE
    WHEN d.status = 'inventory_reserved' THEN 'محجوز'
    WHEN d.status = 'in_delivery' THEN 'محجوز بيع'
    WHEN d.status = 'completed' THEN 'مكتمل'
    ELSE get_deal_status_label(d.status)
  END as reservation_label
FROM deals d;

-- Grant access to the view
GRANT SELECT ON deals_with_labels TO authenticated;
GRANT SELECT ON deals_with_labels TO anon;
