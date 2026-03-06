import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InventorySettings, PalletType, PalletSize, QualityGrade, PalletCondition, UsageType } from './useInventorySettings';

export interface InventoryBatch {
  id: string;
  batch_id: string;
  phone: string;
  supplier_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  available_quantity: number;
  price_per_pallet: number;
  pallet_condition: string;
  city: string;
  description: string;
  status: string;
  approval_status: string;
  image_url: string;
  images_count: number;
  created_at: string;
  updated_at: string;
}

export interface OperationLog {
  id: string;
  batch_id: string;
  operation_type: string;
  performed_by: string;
  performed_by_type: string;
  old_values: any;
  new_values: any;
  reason: string;
  notes: string;
  created_at: string;
}

export function useAdminInventory(adminEmail: string) {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [drafts, setDrafts] = useState<InventoryBatch[]>([]);
  const [operations, setOperations] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async (status?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_get_inventory_batches', {
        p_admin_email: adminEmail,
        p_status: status || null,
        p_approval_status: null,
        p_city: null,
        p_supplier_phone: null,
      });

      if (err) throw err;
      return data || [];
    } catch (err) {
      console.error('Error fetching batches:', err);
      throw err;
    }
  };

  const fetchDrafts = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_get_draft_inventory', {
        p_admin_email: adminEmail,
      });

      if (err) throw err;
      return data || [];
    } catch (err) {
      console.error('Error fetching drafts:', err);
      throw err;
    }
  };

  const fetchOperations = async () => {
    try {
      const { data, error: err } = await supabase
        .from('inventory_operations_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (err) throw err;
      return data || [];
    } catch (err) {
      console.error('Error fetching operations:', err);
      throw err;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [batchesData, draftsData, opsData] = await Promise.all([
        fetchBatches(),
        fetchDrafts(),
        fetchOperations(),
      ]);

      setBatches(batchesData);
      setDrafts(draftsData);
      setOperations(opsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin_inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_operations_log' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminEmail]);

  const updateBatch = async (
    batchId: string,
    updates: Partial<{
      pallet_type: string;
      size: string;
      quality: string;
      quantity: number;
      price_per_pallet: number;
      city: string;
      description: string;
      pallet_condition: string;
    }>,
    reason?: string
  ) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_update_inventory_batch', {
        p_admin_email: adminEmail,
        p_batch_id: batchId,
        p_pallet_type: updates.pallet_type || null,
        p_size: updates.size || null,
        p_quality: updates.quality || null,
        p_quantity: updates.quantity || null,
        p_price_per_pallet: updates.price_per_pallet || null,
        p_city: updates.city || null,
        p_description: updates.description || null,
        p_pallet_condition: updates.pallet_condition || null,
        p_reason: reason || null,
      });

      if (err) throw err;
      await loadData();
      return data;
    } catch (err) {
      console.error('Error updating batch:', err);
      throw err;
    }
  };

  const deleteBatch = async (batchId: string, reason: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_delete_inventory_batch', {
        p_admin_email: adminEmail,
        p_batch_id: batchId,
        p_reason: reason,
      });

      if (err) throw err;
      await loadData();
      return data;
    } catch (err) {
      console.error('Error deleting batch:', err);
      throw err;
    }
  };

  const pauseBatch = async (batchId: string, reason: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_pause_inventory_batch', {
        p_admin_email: adminEmail,
        p_batch_id: batchId,
        p_reason: reason,
      });

      if (err) throw err;
      await loadData();
      return data;
    } catch (err) {
      console.error('Error pausing batch:', err);
      throw err;
    }
  };

  const activateBatch = async (batchId: string, notes?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_activate_inventory_batch', {
        p_admin_email: adminEmail,
        p_batch_id: batchId,
        p_notes: notes || null,
      });

      if (err) throw err;
      await loadData();
      return data;
    } catch (err) {
      console.error('Error activating batch:', err);
      throw err;
    }
  };

  const approveBatch = async (batchId: string, notes?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_approve_inventory_batch', {
        p_admin_email: adminEmail,
        p_batch_id: batchId,
        p_notes: notes || null,
      });

      if (err) throw err;
      await loadData();
      return data;
    } catch (err) {
      console.error('Error approving batch:', err);
      throw err;
    }
  };

  const rejectBatch = async (batchId: string, reason: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_reject_inventory_batch', {
        p_admin_email: adminEmail,
        p_batch_id: batchId,
        p_reason: reason,
      });

      if (err) throw err;
      await loadData();
      return data;
    } catch (err) {
      console.error('Error rejecting batch:', err);
      throw err;
    }
  };

  const updateSettings = async (settings: Partial<InventorySettings>) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_update_inventory_settings', {
        p_admin_email: adminEmail,
        p_settings: settings,
      });

      if (err) throw err;
      return data;
    } catch (err) {
      console.error('Error updating settings:', err);
      throw err;
    }
  };

  const managePalletType = async (data: Partial<PalletType> & { id?: string }) => {
    try {
      const { data: result, error: err } = await supabase.rpc('admin_manage_pallet_type', {
        p_admin_email: adminEmail,
        p_id: data.id || null,
        p_name_ar: data.name_ar || null,
        p_name_en: data.name_en || null,
        p_icon: data.icon || null,
        p_is_active: data.is_active !== undefined ? data.is_active : null,
        p_display_order: data.display_order !== undefined ? data.display_order : null,
      });

      if (err) throw err;
      return result;
    } catch (err) {
      console.error('Error managing pallet type:', err);
      throw err;
    }
  };

  const managePalletSize = async (data: Partial<PalletSize> & { id?: string }) => {
    try {
      const { data: result, error: err } = await supabase.rpc('admin_manage_pallet_size', {
        p_admin_email: adminEmail,
        p_id: data.id || null,
        p_pallet_type_id: data.pallet_type_id || null,
        p_length: data.length || null,
        p_width: data.width || null,
        p_max_weight_kg: data.max_weight_kg || null,
        p_name_ar: data.name_ar || null,
        p_name_en: data.name_en || null,
        p_is_active: data.is_active !== undefined ? data.is_active : null,
        p_display_order: data.display_order !== undefined ? data.display_order : null,
      });

      if (err) throw err;
      return result;
    } catch (err) {
      console.error('Error managing pallet size:', err);
      throw err;
    }
  };

  const manageQualityGrade = async (data: Partial<QualityGrade> & { id?: string }) => {
    try {
      const { data: result, error: err } = await supabase.rpc('admin_manage_quality_grade', {
        p_admin_email: adminEmail,
        p_id: data.id || null,
        p_code: data.code || null,
        p_name_ar: data.name_ar || null,
        p_name_en: data.name_en || null,
        p_color: data.color || null,
        p_description: data.description || null,
        p_is_active: data.is_active !== undefined ? data.is_active : null,
        p_display_order: data.display_order !== undefined ? data.display_order : null,
      });

      if (err) throw err;
      return result;
    } catch (err) {
      console.error('Error managing quality grade:', err);
      throw err;
    }
  };

  const managePalletCondition = async (data: Partial<PalletCondition> & { id?: string }) => {
    try {
      const { data: result, error: err } = await supabase.rpc('admin_manage_pallet_condition', {
        p_admin_email: adminEmail,
        p_id: data.id || null,
        p_code: data.code || null,
        p_name_ar: data.name_ar || null,
        p_name_en: data.name_en || null,
        p_icon: data.icon || null,
        p_is_active: data.is_active !== undefined ? data.is_active : null,
        p_display_order: data.display_order !== undefined ? data.display_order : null,
      });

      if (err) throw err;
      return result;
    } catch (err) {
      console.error('Error managing pallet condition:', err);
      throw err;
    }
  };

  const manageUsageType = async (data: Partial<UsageType> & { id?: string }) => {
    try {
      const { data: result, error: err } = await supabase.rpc('admin_manage_usage_type', {
        p_admin_email: adminEmail,
        p_id: data.id || null,
        p_name_ar: data.name_ar || null,
        p_name_en: data.name_en || null,
        p_icon: data.icon || null,
        p_is_active: data.is_active !== undefined ? data.is_active : null,
        p_display_order: data.display_order !== undefined ? data.display_order : null,
      });

      if (err) throw err;
      return result;
    } catch (err) {
      console.error('Error managing usage type:', err);
      throw err;
    }
  };

  const toggleItemStatus = async (tableName: string, itemId: string, isActive: boolean) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_toggle_item_status', {
        p_admin_email: adminEmail,
        p_table_name: tableName,
        p_item_id: itemId,
        p_is_active: isActive,
      });

      if (err) throw err;
      return data;
    } catch (err) {
      console.error('Error toggling item status:', err);
      throw err;
    }
  };

  const deleteItem = async (tableName: string, itemId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_delete_item', {
        p_admin_email: adminEmail,
        p_table_name: tableName,
        p_item_id: itemId,
      });

      if (err) throw err;
      return data;
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  };

  return {
    batches,
    drafts,
    operations,
    loading,
    error,
    refetch: loadData,
    updateBatch,
    deleteBatch,
    pauseBatch,
    activateBatch,
    approveBatch,
    rejectBatch,
    updateSettings,
    managePalletType,
    managePalletSize,
    manageQualityGrade,
    managePalletCondition,
    manageUsageType,
    toggleItemStatus,
    deleteItem,
  };
}
