/*
  # Add Buyer Inventory Withdraw Quantity Function

  1. New Function
    - `withdraw_buyer_inventory_quantity` - Allows buyers to reduce quantity_available from their purchased inventory
    
  2. Purpose
    - When a buyer wants to sell part of their purchased inventory
    - Reduces the quantity_available field
    - Validates that requested quantity doesn't exceed available quantity
    
  3. Security
    - Uses session system (phone-based)
    - Only buyer who owns the inventory can withdraw
    - Validates quantity constraints

  4. Usage Flow
    - Buyer views their purchased inventory
    - Selects item and specifies quantity to withdraw (e.g., 300 pallets)
    - System reduces quantity_available
    - Buyer then manually adds new inventory batch through normal flow
*/

-- Function to withdraw/reduce quantity from buyer inventory
create or replace function withdraw_buyer_inventory_quantity(
  p_inventory_id uuid,
  p_quantity_to_withdraw int
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_buyer_phone text;
  v_current_available int;
  v_item_details jsonb;
begin
  -- Get buyer phone from session
  v_buyer_phone := current_setting('app.current_user_phone', true);
  
  if v_buyer_phone is null or v_buyer_phone = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'يجب تسجيل الدخول أولاً'
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
    and buyer_phone = v_buyer_phone;

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
