/*
  # تطوير نظام سجل عمليات المخزون

  1. التعديلات
    - إضافة حقول جديدة لسجل العمليات
    - إضافة functions للتحليلات
    - إضافة Triggers تلقائية
    - تحديث RLS policies

  2. الحقول الجديدة
    - supplier_phone
    - city
    - pallet_type
    - pallet_size
    - quantity_affected
    - quantity_before
    - quantity_after
    - price_before
    - price_after
    - deal_id
    - metadata
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'supplier_phone'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN supplier_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'city'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'pallet_type'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN pallet_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'pallet_size'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN pallet_size text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'quantity_affected'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN quantity_affected integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'quantity_before'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN quantity_before integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'quantity_after'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN quantity_after integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'price_before'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN price_before numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'price_after'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN price_after numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'deal_id'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN deal_id uuid REFERENCES deals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_operations_log' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE inventory_operations_log ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operations_supplier ON inventory_operations_log(supplier_phone);
CREATE INDEX IF NOT EXISTS idx_operations_type ON inventory_operations_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_operations_created ON inventory_operations_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_deal ON inventory_operations_log(deal_id);

DROP POLICY IF EXISTS "Admins can read operations" ON inventory_operations_log;
CREATE POLICY "Admins can read all operations"
  ON inventory_operations_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_staff
      WHERE admin_staff.email = (SELECT auth.jwt()->>'email')
      AND admin_staff.is_active = true
    )
  );

DROP POLICY IF EXISTS "System can insert operations" ON inventory_operations_log;
CREATE POLICY "System can insert operations"
  ON inventory_operations_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_inventory_operation(
  p_operation_type text,
  p_batch_id uuid,
  p_quantity_affected integer DEFAULT 0,
  p_quantity_before integer DEFAULT NULL,
  p_quantity_after integer DEFAULT NULL,
  p_price_before numeric DEFAULT NULL,
  p_price_after numeric DEFAULT NULL,
  p_deal_id uuid DEFAULT NULL,
  p_performed_by text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
  v_batch record;
BEGIN
  SELECT 
    phone as supplier_phone,
    city,
    pallet_type,
    size as pallet_size
  INTO v_batch
  FROM inventory_batches
  WHERE id = p_batch_id;

  INSERT INTO inventory_operations_log (
    operation_type,
    batch_id,
    supplier_phone,
    city,
    pallet_type,
    pallet_size,
    quantity_affected,
    quantity_before,
    quantity_after,
    price_before,
    price_after,
    deal_id,
    performed_by,
    metadata
  ) VALUES (
    p_operation_type,
    p_batch_id,
    v_batch.supplier_phone,
    v_batch.city,
    v_batch.pallet_type,
    v_batch.pallet_size,
    p_quantity_affected,
    p_quantity_before,
    p_quantity_after,
    p_price_before,
    p_price_after,
    p_deal_id,
    COALESCE(p_performed_by, v_batch.supplier_phone),
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_log_inventory_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_inventory_operation(
    'inventory_created',
    NEW.id,
    NEW.quantity,
    NULL,
    NEW.quantity,
    NULL,
    NEW.price_per_pallet,
    NULL,
    NEW.phone,
    jsonb_build_object(
      'quality', NEW.quality,
      'condition', NEW.pallet_condition
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_log_inventory_update()
RETURNS TRIGGER AS $$
DECLARE
  v_operation_type text;
BEGIN
  IF OLD.quantity != NEW.quantity THEN
    IF NEW.quantity > OLD.quantity THEN
      v_operation_type := 'quantity_increased';
    ELSE
      v_operation_type := 'quantity_decreased';
    END IF;
    
    PERFORM log_inventory_operation(
      v_operation_type,
      NEW.id,
      ABS(NEW.quantity - OLD.quantity),
      OLD.quantity,
      NEW.quantity,
      NULL,
      NULL,
      NULL,
      'system',
      jsonb_build_object('reason', 'quantity_update')
    );
  END IF;

  IF OLD.price_per_pallet != NEW.price_per_pallet THEN
    PERFORM log_inventory_operation(
      'price_updated',
      NEW.id,
      0,
      NULL,
      NULL,
      OLD.price_per_pallet,
      NEW.price_per_pallet,
      NULL,
      'system',
      jsonb_build_object('reason', 'price_change')
    );
  END IF;

  IF OLD.status != NEW.status THEN
    PERFORM log_inventory_operation(
      'status_changed',
      NEW.id,
      0,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      'system',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_inventory_insert ON inventory_batches;
CREATE TRIGGER log_inventory_insert
  AFTER INSERT ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_inventory_insert();

DROP TRIGGER IF EXISTS log_inventory_update ON inventory_batches;
CREATE TRIGGER log_inventory_update
  AFTER UPDATE ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_inventory_update();

CREATE OR REPLACE FUNCTION get_inventory_analytics(
  p_days integer DEFAULT 30
) RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_today_created integer;
  v_today_updates integer;
  v_today_deactivated integer;
  v_deals_reduced integer;
  v_top_size_deals text;
  v_top_type_deals text;
  v_top_size_active text;
  v_top_type_active text;
BEGIN
  SELECT COUNT(*) INTO v_today_created
  FROM inventory_operations_log
  WHERE operation_type = 'inventory_created'
  AND created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_today_updates
  FROM inventory_operations_log
  WHERE operation_type IN ('quantity_decreased', 'quantity_increased', 'price_updated')
  AND created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_today_deactivated
  FROM inventory_operations_log
  WHERE operation_type = 'status_changed'
  AND metadata->>'new_status' IN ('paused', 'fulfilled')
  AND created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_deals_reduced
  FROM inventory_operations_log
  WHERE operation_type = 'quantity_decreased'
  AND deal_id IS NOT NULL
  AND created_at >= CURRENT_DATE;

  SELECT pallet_size INTO v_top_size_deals
  FROM inventory_operations_log
  WHERE deal_id IS NOT NULL
  AND created_at >= (CURRENT_DATE - INTERVAL '1 day' * p_days)
  AND pallet_size IS NOT NULL
  GROUP BY pallet_size
  ORDER BY SUM(quantity_affected) DESC
  LIMIT 1;

  SELECT pallet_type INTO v_top_type_deals
  FROM inventory_operations_log
  WHERE deal_id IS NOT NULL
  AND created_at >= (CURRENT_DATE - INTERVAL '1 day' * p_days)
  AND pallet_type IS NOT NULL
  GROUP BY pallet_type
  ORDER BY SUM(quantity_affected) DESC
  LIMIT 1;

  SELECT size INTO v_top_size_active
  FROM inventory_batches
  WHERE status = 'active'
  AND size IS NOT NULL
  GROUP BY size
  ORDER BY SUM(quantity) DESC
  LIMIT 1;

  SELECT pallet_type INTO v_top_type_active
  FROM inventory_batches
  WHERE status = 'active'
  AND pallet_type IS NOT NULL
  GROUP BY pallet_type
  ORDER BY SUM(quantity) DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'today_created', COALESCE(v_today_created, 0),
    'today_updates', COALESCE(v_today_updates, 0),
    'today_deactivated', COALESCE(v_today_deactivated, 0),
    'deals_reduced', COALESCE(v_deals_reduced, 0),
    'top_size_deals', COALESCE(v_top_size_deals, 'N/A'),
    'top_type_deals', COALESCE(v_top_type_deals, 'N/A'),
    'top_size_active', COALESCE(v_top_size_active, 'N/A'),
    'top_type_active', COALESCE(v_top_type_active, 'N/A')
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_supplier_operations_summary(
  p_supplier_phone text
) RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_created', COUNT(*) FILTER (WHERE operation_type = 'inventory_created'),
    'total_updates', COUNT(*) FILTER (WHERE operation_type IN ('quantity_decreased', 'quantity_increased', 'price_updated')),
    'total_deactivated', COUNT(*) FILTER (WHERE operation_type = 'status_changed' AND metadata->>'new_status' IN ('paused', 'fulfilled')),
    'total_deals', COUNT(DISTINCT deal_id) FILTER (WHERE deal_id IS NOT NULL),
    'total_quantity_sold', COALESCE(SUM(quantity_affected) FILTER (WHERE deal_id IS NOT NULL), 0)
  )
  INTO v_result
  FROM inventory_operations_log
  WHERE supplier_phone = p_supplier_phone;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_batch_timeline(
  p_batch_id uuid
) RETURNS TABLE (
  operation_type text,
  quantity_affected integer,
  quantity_before integer,
  quantity_after integer,
  price_before numeric,
  price_after numeric,
  deal_id uuid,
  performed_by text,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.operation_type,
    l.quantity_affected,
    l.quantity_before,
    l.quantity_after,
    l.price_before,
    l.price_after,
    l.deal_id,
    l.performed_by,
    l.metadata,
    l.created_at
  FROM inventory_operations_log l
  WHERE l.batch_id = p_batch_id
  ORDER BY l.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
