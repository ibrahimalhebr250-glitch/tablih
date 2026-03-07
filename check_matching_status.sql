-- فحص الطلبات المعلقة
SELECT 
  id,
  request_id,
  pallet_type,
  size,
  quality,
  quantity,
  city,
  status,
  accept_close_quality,
  accept_close_city,
  accept_partial_delivery,
  created_at
FROM orders 
WHERE status = 'unmatched'
ORDER BY created_at DESC
LIMIT 10;

-- فحص المخزون المتاح
SELECT 
  id,
  pallet_type,
  size,
  quality,
  available_quantity,
  price_per_pallet,
  city,
  status,
  created_at
FROM inventory_batches 
WHERE status = 'active' AND available_quantity > 0
ORDER BY created_at DESC
LIMIT 10;

-- فحص توحيد المصطلحات
SELECT * FROM pallet_type_mappings ORDER BY normalized_value, input_value;
