import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderWithDetails {
  id: string;
  request_id: string;
  phone: string;
  buyer_name: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  order_type_code: string;
  current_stage: string;
  match_count: number;
  status: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  order_source: string;
  pallet_condition: string;
  source_supplier_phone: string | null;
}

export interface OrderDraft {
  id: string;
  phone: string;
  draft_data: any;
  current_step: string;
  last_field_completed: string | null;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface OrderType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  bg_color: string;
  border_color: string;
  is_active: boolean;
  display_order: number;
}

export interface FlexibilityOption {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  is_active: boolean;
  display_order: number;
  affects_matching: boolean;
  matching_logic: any;
}

export interface QuantitySettings {
  id: string;
  min_quantity: number;
  max_quantity: number;
  quantity_step: number;
  quick_quantities: number[];
}

export interface RecurringOrder {
  id: string;
  order_id: string;
  buyer_phone: string;
  recurrence_type: string;
  recurrence_schedule: any;
  next_execution_at: string | null;
  last_execution_at: string | null;
  execution_count: number;
  is_active: boolean;
  paused_at: string | null;
  pause_reason: string | null;
  created_at: string;
  order?: OrderWithDetails;
}

export interface OrderAnalytics {
  date: string;
  total_orders: number;
  total_quantity: number;
  matched_orders: number;
  unmatched_orders: number;
  most_requested_type: string | null;
  most_requested_size: string | null;
  most_requested_city: string | null;
  most_requested_quality: string | null;
  active_buyers_count: number;
  avg_order_quantity: number;
  match_rate: number;
}

export interface OrderOperation {
  id: string;
  operation_type: string;
  order_id: string | null;
  request_id: string | null;
  buyer_phone: string | null;
  buyer_name: string | null;
  city: string | null;
  pallet_type: string | null;
  pallet_size: string | null;
  quality: string | null;
  quantity: number | null;
  performed_by: string;
  performed_by_type: string;
  performed_by_phone: string | null;
  old_values: any;
  new_values: any;
  notes: string | null;
  metadata: any;
  created_at: string;
}

export function useAdminOrders() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [drafts, setDrafts] = useState<OrderDraft[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [flexibilityOptions, setFlexibilityOptions] = useState<FlexibilityOption[]>([]);
  const [quantitySettings, setQuantitySettings] = useState<QuantitySettings | null>(null);
  const [recurringOrders, setRecurringOrders] = useState<RecurringOrder[]>([]);
  const [analytics, setAnalytics] = useState<OrderAnalytics[]>([]);
  const [operations, setOperations] = useState<OrderOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const adminEmail = (() => {
        try {
          const raw = sessionStorage.getItem('adminStaffData');
          if (raw) return JSON.parse(raw)?.email || null;
        } catch { return null; }
        return null;
      })();

      if (adminEmail) {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('admin_get_orders', { p_admin_email: adminEmail });

        if (!rpcError && rpcData) {
          setOrders((rpcData as any[]).map((order: any) => ({
            ...order,
            order_source: order.order_source || 'manual_order',
            pallet_condition: order.pallet_condition || '',
            source_supplier_phone: order.source_supplier_phone || null,
          })));
          return;
        }
      }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          platform_users!orders_user_id_fkey (display_name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;

        setOrders((fallbackData || []).map((order: any) => ({
          ...order,
          buyer_name: order.phone || 'غير معروف',
          order_source: order.order_source || 'manual_order',
          pallet_condition: order.pallet_condition || '',
          source_supplier_phone: order.source_supplier_phone || null,
        })));
        return;
      }

      const ordersWithNames = (data || []).map((order: any) => ({
        ...order,
        buyer_name: order.platform_users?.display_name || order.phone || 'غير معروف',
        order_source: order.order_source || 'manual_order',
        pallet_condition: order.pallet_condition || '',
        source_supplier_phone: order.source_supplier_phone || null,
      }));

      setOrders(ordersWithNames);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchDrafts = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('order_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDrafts(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchOrderTypes = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('order_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setOrderTypes(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchFlexibilityOptions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('order_flexibility_options')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setFlexibilityOptions(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchQuantitySettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('order_quantity_settings')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;
      setQuantitySettings(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchRecurringOrders = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('recurring_orders')
        .select(`
          *,
          orders (*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRecurringOrders(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('order_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (fetchError) throw fetchError;
      setAnalytics(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchOperations = async (limit = 100) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('order_operations_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setOperations(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOrders(),
      fetchDrafts(),
      fetchOrderTypes(),
      fetchFlexibilityOptions(),
      fetchQuantitySettings(),
      fetchRecurringOrders(),
      fetchAnalytics(),
      fetchOperations()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();

    const ordersChannel = supabase
      .channel('admin-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        fetchAnalytics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_operations_log' }, () => {
        fetchOperations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_analytics' }, () => {
        fetchAnalytics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_drafts' }, () => {
        fetchDrafts();
      })
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, []);

  const updateOrder = async (orderId: string, updates: Partial<OrderWithDetails>) => {
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (updateError) throw updateError;
      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_delete_order', {
        p_order_id: orderId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.error || 'فشل حذف الطلب');

      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('order_drafts')
        .delete()
        .eq('id', draftId);

      if (deleteError) throw deleteError;
      await fetchDrafts();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateOrderType = async (typeId: string, updates: Partial<OrderType>) => {
    try {
      const { error: updateError } = await supabase
        .from('order_types')
        .update(updates)
        .eq('id', typeId);

      if (updateError) throw updateError;
      await fetchOrderTypes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const createOrderType = async (newType: Omit<OrderType, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error: insertError } = await supabase
        .from('order_types')
        .insert([newType]);

      if (insertError) throw insertError;
      await fetchOrderTypes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateFlexibilityOption = async (optionId: string, updates: Partial<FlexibilityOption>) => {
    try {
      const { error: updateError } = await supabase
        .from('order_flexibility_options')
        .update(updates)
        .eq('id', optionId);

      if (updateError) throw updateError;
      await fetchFlexibilityOptions();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateQuantitySettings = async (updates: Partial<QuantitySettings>) => {
    try {
      if (!quantitySettings?.id) throw new Error('No settings found');

      const { error: updateError } = await supabase
        .from('order_quantity_settings')
        .update(updates)
        .eq('id', quantitySettings.id);

      if (updateError) throw updateError;
      await fetchQuantitySettings();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const pauseRecurringOrder = async (recurringId: string, reason?: string) => {
    try {
      const { error: updateError } = await supabase
        .from('recurring_orders')
        .update({
          is_active: false,
          paused_at: new Date().toISOString(),
          pause_reason: reason || null
        })
        .eq('id', recurringId);

      if (updateError) throw updateError;
      await fetchRecurringOrders();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resumeRecurringOrder = async (recurringId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('recurring_orders')
        .update({
          is_active: true,
          paused_at: null,
          pause_reason: null
        })
        .eq('id', recurringId);

      if (updateError) throw updateError;
      await fetchRecurringOrders();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteOperationLog = async (operationId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_delete_single_operation_log', {
        p_operation_id: operationId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.error || 'فشل حذف سجل العملية');

      await fetchOperations();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const clearAllOperationsLog = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_clear_all_operations_log');

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.error || 'فشل مسح سجل العمليات');

      await fetchOperations();
      return { success: true, message: data.message || 'تم مسح جميع السجلات بنجاح' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    orders,
    drafts,
    orderTypes,
    flexibilityOptions,
    quantitySettings,
    recurringOrders,
    analytics,
    operations,
    loading,
    error,
    refresh: loadAllData,
    updateOrder,
    deleteOrder,
    deleteDraft,
    updateOrderType,
    createOrderType,
    updateFlexibilityOption,
    updateQuantitySettings,
    pauseRecurringOrder,
    resumeRecurringOrder,
    deleteOperationLog,
    clearAllOperationsLog
  };
}
