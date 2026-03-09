import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface InventoryOperation {
  id: string;
  operation_type: string;
  batch_id: string | null;
  supplier_phone: string | null;
  city: string | null;
  pallet_type: string | null;
  pallet_size: string | null;
  quantity_affected: number;
  quantity_before: number | null;
  quantity_after: number | null;
  price_before: number | null;
  price_after: number | null;
  deal_id: string | null;
  performed_by: string;
  metadata: any;
  created_at: string;
}

export interface InventoryAnalytics {
  today_created: number;
  today_updates: number;
  today_deactivated: number;
  deals_reduced: number;
  top_size_deals: string;
  top_type_deals: string;
  top_size_active: string;
  top_type_active: string;
}

export interface SupplierOperationsSummary {
  total_created: number;
  total_updates: number;
  total_deactivated: number;
  total_deals: number;
  total_quantity_sold: number;
}

export function useInventoryOperations(adminEmail: string) {
  const [operations, setOperations] = useState<InventoryOperation[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOperations();
    fetchAnalytics();

    const channel = supabase
      .channel('inventory_operations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_operations_log',
        },
        () => {
          fetchOperations();
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminEmail]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_operations_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setOperations(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching operations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_inventory_analytics', {
        p_days: 30,
      });

      if (error) throw error;
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchSupplierSummary = async (supplierPhone: string): Promise<SupplierOperationsSummary | null> => {
    try {
      const { data, error } = await supabase.rpc('get_supplier_operations_summary', {
        p_supplier_phone: supplierPhone,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching supplier summary:', err);
      return null;
    }
  };

  const fetchBatchTimeline = async (batchId: string): Promise<InventoryOperation[]> => {
    try {
      const { data, error } = await supabase.rpc('get_batch_timeline', {
        p_batch_id: batchId,
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching batch timeline:', err);
      return [];
    }
  };

  const searchOperations = async (filters: {
    operation_type?: string;
    supplier_phone?: string;
    city?: string;
    pallet_type?: string;
    pallet_size?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<InventoryOperation[]> => {
    try {
      let query = supabase
        .from('inventory_operations_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.operation_type) {
        query = query.eq('operation_type', filters.operation_type);
      }
      if (filters.supplier_phone) {
        query = query.ilike('supplier_phone', `%${filters.supplier_phone}%`);
      }
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.pallet_type) {
        query = query.eq('pallet_type', filters.pallet_type);
      }
      if (filters.pallet_size) {
        query = query.eq('pallet_size', filters.pallet_size);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error searching operations:', err);
      return [];
    }
  };

  const deleteOperations = async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('delete_inventory_operations', {
        p_ids: ids,
        p_admin_email: adminEmail,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Delete failed');
      await fetchOperations();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting operations:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteAllOperations = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('delete_all_inventory_operations', {
        p_admin_email: adminEmail,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Delete failed');
      await fetchOperations();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting all operations:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    operations,
    analytics,
    loading,
    error,
    fetchSupplierSummary,
    fetchBatchTimeline,
    searchOperations,
    deleteOperations,
    deleteAllOperations,
    refetch: () => {
      fetchOperations();
      fetchAnalytics();
    },
  };
}
