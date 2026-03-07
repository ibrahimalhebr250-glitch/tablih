/*
  # Fix Withdraw Function - Add Phone Parameter

  1. Changes
    - Drop old `withdraw_buyer_inventory_quantity` function
    - Create new version that accepts `p_buyer_phone` parameter
    - Remove dependency on session system
    
  2. Security
    - Still validates ownership by comparing buyer_phone
    - Validates quantity constraints
*/

-- Drop old function
drop function if exists withdraw_buyer_inventory_quantity(uuid, int);

-- Create new version with phone parameter
create or replace function withdraw_buyer_inventory_quantity(
  p_inventory_id uuid,
  p_quantity_to_withdraw int,
  p_buyer_phone text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_current_available int;
  v_item_details jsonb;
begin
  -- Validate phone
  if p_buyer_phone is null or p_buyer_phone = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'رقم الهاتف مطلوب'
    );
  end if;

  -- Validate quantity
  if p_quantity_to_withdraw <= 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'الكمية يجب أن تكون أكبر من صفر'
    );
  end if;

  -- Get current inventory item and verify ownership
  select quantity_available into v_current_available
  from buyer_inventory
  where id = p_inventory_id
    and buyer_phone = p_buyer_phone;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'العنصر غير موجود أو لا تملك صلاحية الوصول'
    );
  end if;

  -- Check if requested quantity is available
  if p_quantity_to_withdraw > v_current_available then
    return jsonb_build_object(
      'success', false,
      'error', format('الكمية المتاحة فقط %s طبلية', v_current_available)
    );
  end if;

  -- Update quantity_available
  update buyer_inventory
  set 
    quantity_available = quantity_available - p_quantity_to_withdraw,
    updated_at = now()
  where id = p_inventory_id;

  -- Get updated item details
  select jsonb_build_object(
    'id', id,
    'quantity', quantity,
    'quantity_available', quantity_available,
    'pallet_type', pallet_type,
    'withdrawn_quantity', p_quantity_to_withdraw
  ) into v_item_details
  from buyer_inventory
  where id = p_inventory_id;

  return jsonb_build_object(
    'success', true,
    'message', format('تم سحب %s طبلية بنجاح', p_quantity_to_withdraw),
    'item', v_item_details
  );
end;
$$;
