import { supabase } from '../lib/supabase';

export async function logInventoryOperation(
  operationType: string,
  batchId: string,
  options: {
    quantityAffected?: number;
    quantityBefore?: number;
    quantityAfter?: number;
    priceBefore?: number;
    priceAfter?: number;
    dealId?: string;
    performedBy?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    const { data, error } = await supabase.rpc('log_inventory_operation', {
      p_operation_type: operationType,
      p_batch_id: batchId,
      p_quantity_affected: options.quantityAffected || 0,
      p_quantity_before: options.quantityBefore || null,
      p_quantity_after: options.quantityAfter || null,
      p_price_before: options.priceBefore || null,
      p_price_after: options.priceAfter || null,
      p_deal_id: options.dealId || null,
      p_performed_by: options.performedBy || null,
      p_metadata: options.metadata || {},
    });

    if (error) {
      console.error('Error logging inventory operation:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to log inventory operation:', err);
    return null;
  }
}

export function useInventoryLogger() {
  const logCreated = async (
    batchId: string,
    quantity: number,
    price: number,
    supplierPhone: string,
    metadata?: Record<string, any>
  ) => {
    return logInventoryOperation('inventory_created', batchId, {
      quantityAffected: quantity,
      quantityAfter: quantity,
      priceAfter: price,
      performedBy: supplierPhone,
      metadata,
    });
  };

  const logDraftSaved = async (
    batchId: string,
    supplierPhone: string,
    metadata?: Record<string, any>
  ) => {
    return logInventoryOperation('draft_saved', batchId, {
      performedBy: supplierPhone,
      metadata,
    });
  };

  const logPublished = async (
    batchId: string,
    supplierPhone: string,
    metadata?: Record<string, any>
  ) => {
    return logInventoryOperation('inventory_published', batchId, {
      performedBy: supplierPhone,
      metadata,
    });
  };

  const logQuantityChanged = async (
    batchId: string,
    oldQuantity: number,
    newQuantity: number,
    supplierPhone: string,
    metadata?: Record<string, any>
  ) => {
    const operationType = newQuantity > oldQuantity ? 'quantity_increased' : 'quantity_decreased';
    return logInventoryOperation(operationType, batchId, {
      quantityAffected: Math.abs(newQuantity - oldQuantity),
      quantityBefore: oldQuantity,
      quantityAfter: newQuantity,
      performedBy: supplierPhone,
      metadata,
    });
  };

  const logPriceChanged = async (
    batchId: string,
    oldPrice: number,
    newPrice: number,
    supplierPhone: string,
    metadata?: Record<string, any>
  ) => {
    return logInventoryOperation('price_updated', batchId, {
      priceBefore: oldPrice,
      priceAfter: newPrice,
      performedBy: supplierPhone,
      metadata,
    });
  };

  return {
    logCreated,
    logDraftSaved,
    logPublished,
    logQuantityChanged,
    logPriceChanged,
  };
}
